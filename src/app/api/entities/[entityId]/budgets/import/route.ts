import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { budgetCsvRowSchema } from "@/validators/budget";
import { Prisma } from "@/generated/prisma/client";

interface CsvRow {
  accountNumber: string;
  period: string;
  amount: string;
}

/**
 * Parse CSV text into rows with flexible header matching.
 * Accepts: account_number/accountNumber, period, amount
 */
function parseBudgetCsv(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/"/g, ""));

  const accountIdx = headers.findIndex(
    (h) =>
      h === "account_number" ||
      h === "accountnumber" ||
      h === "account number" ||
      h === "account"
  );
  const periodIdx = headers.findIndex((h) => h === "period");
  const amountIdx = headers.findIndex((h) => h === "amount");

  if (accountIdx === -1 || periodIdx === -1 || amountIdx === -1) {
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

    rows.push({
      accountNumber: cols[accountIdx] || "",
      period: cols[periodIdx] || "",
      amount: cols[amountIdx] || "",
    });
  }

  return rows;
}

/**
 * POST /api/entities/:entityId/budgets/import
 *
 * Accepts JSON body { csv: "..." } with CSV text.
 * Validates rows, looks up accounts, upserts budgets.
 * Returns { imported, skipped, errors }.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
  });
  if (!access) return errorResponse("Entity not found", 403);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  let body: { csv: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.csv || typeof body.csv !== "string") {
    return errorResponse("Missing csv field", 400);
  }

  const rows = parseBudgetCsv(body.csv);
  if (rows.length === 0) {
    return errorResponse(
      "No valid rows found. Required columns: account_number, period, amount",
      400
    );
  }

  // Validate each row
  const errors: string[] = [];
  const validRows: CsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const result = budgetCsvRowSchema.safeParse(rows[i]);
    if (!result.success) {
      const issues = result.error.issues.map((e) => e.message).join("; ");
      errors.push(`Row ${i + 2}: ${issues}`);
    } else {
      validRows.push(rows[i]);
    }
  }

  if (validRows.length === 0) {
    return errorResponse(
      `All rows failed validation:\n${errors.slice(0, 20).join("\n")}`,
      400
    );
  }

  // Look up accounts by number for this entity
  const accounts = await prisma.account.findMany({
    where: { entityId, isActive: true },
    select: { id: true, number: true, type: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.number, a]));

  // Process valid rows
  let skipped = 0;
  const upsertOps: ReturnType<typeof prisma.budget.upsert>[] = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const account = accountMap.get(row.accountNumber);

    if (!account) {
      skipped++;
      continue;
    }

    // Only budget INCOME and EXPENSE accounts
    if (account.type !== "INCOME" && account.type !== "EXPENSE") {
      skipped++;
      continue;
    }

    // Parse period "MM/YYYY" into { month, year }
    const [monthStr, yearStr] = row.period.split("/");
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    upsertOps.push(
      prisma.budget.upsert({
        where: {
          entityId_accountId_year_month: {
            entityId,
            accountId: account.id,
            year,
            month,
          },
        },
        create: {
          entityId,
          accountId: account.id,
          year,
          month,
          amount: new Prisma.Decimal(row.amount),
        },
        update: {
          amount: new Prisma.Decimal(row.amount),
        },
      })
    );
  }

  if (upsertOps.length > 0) {
    await prisma.$transaction(upsertOps);
  }

  return successResponse({
    imported: upsertOps.length,
    skipped,
    errors,
  });
}
