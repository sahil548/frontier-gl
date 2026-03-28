import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";

const yearEndSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  retainedEarningsAccountId: z.string().min(1),
});

/**
 * POST /api/entities/:entityId/year-end-close
 *
 * Generates closing entries that zero out income and expense accounts
 * and transfer the net amount to a retained earnings account.
 *
 * Requirements:
 * - All 12 months of the fiscal year must be closed
 * - Retained earnings account must be an active EQUITY leaf account
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = yearEndSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { fiscalYear, retainedEarningsAccountId } = result.data;

  // Verify all 12 months are closed
  const closedPeriods = await prisma.periodClose.findMany({
    where: { entityId, year: fiscalYear },
  });
  const closedMonths = new Set(closedPeriods.map((p) => p.month));
  const missingMonths = [];
  for (let m = 1; m <= 12; m++) {
    if (!closedMonths.has(m)) missingMonths.push(m);
  }
  if (missingMonths.length > 0) {
    return errorResponse(
      `All 12 months must be closed before year-end close. Missing: ${missingMonths.join(", ")}`,
      400
    );
  }

  // Verify retained earnings account
  const reAccount = await prisma.account.findFirst({
    where: {
      id: retainedEarningsAccountId,
      entityId,
      isActive: true,
      type: "EQUITY",
    },
    include: { children: { where: { isActive: true }, select: { id: true } } },
  });
  if (!reAccount) {
    return errorResponse("Retained earnings account must be an active EQUITY account in this entity", 400);
  }
  if (reAccount.children.length > 0) {
    return errorResponse("Retained earnings account must be a leaf account (no sub-accounts)", 400);
  }

  // Check if year-end close was already run for this year
  const existingClose = await prisma.journalEntry.findFirst({
    where: {
      entityId,
      description: `Year-End Closing Entry - FY${fiscalYear}`,
      status: "POSTED",
    },
  });
  if (existingClose) {
    return errorResponse(`Year-end close has already been run for FY${fiscalYear}`, 409);
  }

  // Get income and expense balances for the fiscal year
  const startDate = new Date(`${fiscalYear}-01-01`);
  const endDate = new Date(`${fiscalYear}-12-31`);

  const balances = await prisma.$queryRaw<
    { account_id: string; account_type: string; net_balance: unknown }[]
  >(
    Prisma.sql`
      SELECT
        a.id AS account_id,
        a.type::text AS account_type,
        COALESCE(SUM(
          CASE
            WHEN a.type = 'INCOME' THEN jel.credit - jel.debit
            WHEN a.type = 'EXPENSE' THEN jel.debit - jel.credit
            ELSE 0
          END
        ), 0) AS net_balance
      FROM accounts a
      JOIN journal_entry_lines jel ON jel."accountId" = a.id
      JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
        AND a.type IN ('INCOME', 'EXPENSE')
      GROUP BY a.id, a.type
      HAVING COALESCE(SUM(
        CASE
          WHEN a.type = 'INCOME' THEN jel.credit - jel.debit
          WHEN a.type = 'EXPENSE' THEN jel.debit - jel.credit
          ELSE 0
        END
      ), 0) != 0
    `
  );

  if (balances.length === 0) {
    return errorResponse("No income or expense balances to close for this fiscal year", 400);
  }

  // Build closing entry lines
  // For each income account: debit to zero it out
  // For each expense account: credit to zero it out
  // Net difference goes to retained earnings
  const lines: { accountId: string; debit: number; credit: number }[] = [];
  let totalIncomeClose = 0;
  let totalExpenseClose = 0;

  for (const row of balances) {
    const amount = Number(row.net_balance);
    if (amount === 0) continue;

    if (row.account_type === "INCOME") {
      // Income has credit-normal balance; debit to close
      lines.push({ accountId: row.account_id, debit: amount, credit: 0 });
      totalIncomeClose += amount;
    } else {
      // Expense has debit-normal balance; credit to close
      lines.push({ accountId: row.account_id, debit: 0, credit: amount });
      totalExpenseClose += amount;
    }
  }

  // Net to retained earnings: income - expenses
  const netToRE = totalIncomeClose - totalExpenseClose;
  if (netToRE > 0) {
    // Net income → credit retained earnings
    lines.push({ accountId: retainedEarningsAccountId, debit: 0, credit: netToRE });
  } else if (netToRE < 0) {
    // Net loss → debit retained earnings
    lines.push({ accountId: retainedEarningsAccountId, debit: Math.abs(netToRE), credit: 0 });
  }

  // Create and auto-post the closing entry in one transaction
  const entry = await prisma.$transaction(async (tx) => {
    const entryNumber = await generateNextEntryNumber(tx, entityId);

    const je = await tx.journalEntry.create({
      data: {
        entityId,
        entryNumber,
        date: endDate,
        description: `Year-End Closing Entry - FY${fiscalYear}`,
        status: "POSTED",
        createdBy: userId,
        approvedBy: userId,
        postedBy: userId,
        approvedAt: new Date(),
        postedAt: new Date(),
        lineItems: {
          create: lines.map((line, idx) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            sortOrder: idx,
          })),
        },
      },
    });

    // Update account balances
    for (const line of lines) {
      const debitAmount = new Prisma.Decimal(line.debit);
      const creditAmount = new Prisma.Decimal(line.credit);
      const balanceChange = debitAmount.minus(creditAmount);

      await tx.accountBalance.upsert({
        where: { accountId: line.accountId },
        create: {
          accountId: line.accountId,
          debitTotal: debitAmount,
          creditTotal: creditAmount,
          balance: balanceChange,
        },
        update: {
          debitTotal: { increment: debitAmount },
          creditTotal: { increment: creditAmount },
          balance: { increment: balanceChange },
        },
      });
    }

    // Audit trail
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId: je.id,
        action: "YEAR_END_CLOSE",
        userId,
      },
    });

    return je;
  });

  return successResponse(
    {
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      description: entry.description,
      lineCount: lines.length,
      netToRetainedEarnings: netToRE,
    },
    201
  );
}
