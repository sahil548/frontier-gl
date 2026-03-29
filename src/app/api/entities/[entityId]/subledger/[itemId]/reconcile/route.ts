import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const reconcileSchema = z.object({
  statementDate: z.string().refine((s) => !isNaN(Date.parse(s))),
  statementBalance: z.number(),
  notes: z.string().optional(),
  // Optional: statement lines for matching
  statementLines: z
    .array(
      z.object({
        date: z.string(),
        description: z.string(),
        amount: z.number(),
        reference: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * POST /api/entities/:entityId/subledger/:itemId/reconcile
 *
 * Creates a reconciliation for a subledger item.
 * Computes GL balance from posted transactions for the account.
 * If statement lines are provided, attempts auto-matching against GL transactions.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = reconcileSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { statementDate, statementBalance, notes, statementLines } = result.data;

  // Verify subledger item
  const item = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId, isActive: true },
    include: { account: true },
  });
  if (!item) return errorResponse("Subledger item not found", 404);

  // Compute GL balance for this account as of statement date
  const stmtDate = new Date(statementDate);
  const glBalanceResult = await prisma.$queryRaw<{ balance: unknown }[]>(
    Prisma.sql`
      SELECT COALESCE(SUM(jel.debit - jel.credit), 0) AS balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date <= ${stmtDate}
      WHERE jel."accountId" = ${item.accountId}
    `
  );

  const glBalance = Number(glBalanceResult[0]?.balance ?? 0);
  const difference = Math.round((statementBalance - glBalance) * 10000) / 10000;

  const recon = await prisma.$transaction(async (tx) => {
    const rec = await tx.bankReconciliation.create({
      data: {
        subledgerItemId: itemId,
        statementDate: stmtDate,
        statementBalance,
        glBalance,
        difference,
        status: Math.abs(difference) < 0.005 ? "COMPLETED" : "IN_PROGRESS",
        reconciledBy: Math.abs(difference) < 0.005 ? userId : null,
        reconciledAt: Math.abs(difference) < 0.005 ? new Date() : null,
        notes,
      },
    });

    // If statement lines provided, create them and attempt auto-matching
    if (statementLines && statementLines.length > 0) {
      // Get GL transactions for the period
      const glTransactions = await tx.journalEntryLine.findMany({
        where: {
          accountId: item.accountId,
          journalEntry: {
            status: "POSTED",
            date: { lte: stmtDate },
          },
        },
        include: {
          journalEntry: { select: { date: true, description: true } },
        },
      });

      for (const stmtLine of statementLines) {
        const stmtAmount = stmtLine.amount;

        // Try to match: find a GL transaction with the same net amount
        let matchedLineId: string | null = null;
        for (const glTxn of glTransactions) {
          const netAmount = Number(glTxn.debit) - Number(glTxn.credit);
          if (Math.abs(netAmount - stmtAmount) < 0.005) {
            matchedLineId = glTxn.id;
            // Remove from available matches
            const idx = glTransactions.indexOf(glTxn);
            glTransactions.splice(idx, 1);
            break;
          }
        }

        await tx.bankReconciliationLine.create({
          data: {
            reconciliationId: rec.id,
            journalEntryLineId: matchedLineId,
            statementDate: new Date(stmtLine.date),
            statementDesc: stmtLine.description,
            statementAmount: stmtAmount,
            statementRef: stmtLine.reference,
            matchStatus: matchedLineId ? "MATCHED" : "UNMATCHED",
          },
        });
      }
    }

    // Update subledger item's current balance
    await tx.subledgerItem.update({
      where: { id: itemId },
      data: { currentBalance: statementBalance },
    });

    return rec;
  });

  return successResponse(
    {
      id: recon.id,
      statementDate: recon.statementDate.toISOString(),
      statementBalance: recon.statementBalance.toString(),
      glBalance: recon.glBalance.toString(),
      difference: recon.difference.toString(),
      status: recon.status,
      reconciledAt: recon.reconciledAt?.toISOString() ?? null,
    },
    201
  );
}

/**
 * GET /api/entities/:entityId/subledger/:itemId/reconcile
 *
 * Returns reconciliation history for a subledger item.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  const item = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
  });
  if (!item) return errorResponse("Subledger item not found", 404);

  const reconciliations = await prisma.bankReconciliation.findMany({
    where: { subledgerItemId: itemId },
    include: {
      lines: {
        include: {
          journalEntryLine: {
            include: {
              journalEntry: { select: { entryNumber: true, date: true, description: true } },
            },
          },
        },
        orderBy: { statementDate: "asc" },
      },
    },
    orderBy: { statementDate: "desc" },
  });

  return successResponse(
    reconciliations.map((r) => ({
      id: r.id,
      statementDate: r.statementDate.toISOString(),
      statementBalance: r.statementBalance.toString(),
      glBalance: r.glBalance.toString(),
      difference: r.difference.toString(),
      status: r.status,
      reconciledBy: r.reconciledBy,
      reconciledAt: r.reconciledAt?.toISOString() ?? null,
      notes: r.notes,
      lines: r.lines.map((l) => ({
        id: l.id,
        statementDate: l.statementDate?.toISOString() ?? null,
        statementDesc: l.statementDesc,
        statementAmount: l.statementAmount?.toString() ?? null,
        statementRef: l.statementRef,
        matchStatus: l.matchStatus,
        journalEntry: l.journalEntryLine?.journalEntry
          ? {
              entryNumber: l.journalEntryLine.journalEntry.entryNumber,
              date: l.journalEntryLine.journalEntry.date.toISOString(),
              description: l.journalEntryLine.journalEntry.description,
            }
          : null,
      })),
    }))
  );
}
