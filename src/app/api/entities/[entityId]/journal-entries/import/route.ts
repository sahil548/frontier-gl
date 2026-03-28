import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";

interface CsvRow {
  date: string;
  description: string;
  accountNumber: string;
  debit: string;
  credit: string;
  memo?: string;
}

function parseCsvText(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(",").map((h) => h.trim().replace(/"/g, ""));

  // Map header names to expected fields
  const dateIdx = headers.findIndex((h) => h === "date");
  const descIdx = headers.findIndex((h) => h === "description" || h === "desc");
  const acctIdx = headers.findIndex((h) =>
    h === "account" || h === "account_number" || h === "accountnumber" || h === "account number"
  );
  const debitIdx = headers.findIndex((h) => h === "debit");
  const creditIdx = headers.findIndex((h) => h === "credit");
  const memoIdx = headers.findIndex((h) => h === "memo" || h === "note");

  if (dateIdx === -1 || descIdx === -1 || acctIdx === -1 || debitIdx === -1 || creditIdx === -1) {
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    if (cols.length < headers.length) continue;

    rows.push({
      date: cols[dateIdx],
      description: cols[descIdx],
      accountNumber: cols[acctIdx],
      debit: cols[debitIdx] || "0",
      credit: cols[creditIdx] || "0",
      memo: memoIdx !== -1 ? cols[memoIdx] : undefined,
    });
  }

  return rows;
}

/**
 * POST /api/entities/:entityId/journal-entries/import
 *
 * Accepts CSV text in request body with JSON wrapper: { csv: "..." }
 * Groups rows by date+description into journal entries.
 * Creates all entries as DRAFT.
 *
 * Expected CSV columns: date, description, account (number), debit, credit, memo (optional)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  let body: { csv: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.csv || typeof body.csv !== "string") {
    return errorResponse("Missing csv field", 400);
  }

  const rows = parseCsvText(body.csv);
  if (rows.length === 0) {
    return errorResponse(
      "No valid rows found. Required columns: date, description, account, debit, credit",
      400
    );
  }

  // Look up account numbers → IDs for this entity
  const accounts = await prisma.account.findMany({
    where: { entityId, isActive: true },
    select: { id: true, number: true },
  });
  const accountMap = new Map(accounts.map((a) => [a.number, a.id]));

  // Validate all rows
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.date || isNaN(Date.parse(row.date))) {
      errors.push(`Row ${i + 2}: invalid date "${row.date}"`);
    }
    if (!row.description) {
      errors.push(`Row ${i + 2}: missing description`);
    }
    if (!accountMap.has(row.accountNumber)) {
      errors.push(`Row ${i + 2}: unknown account number "${row.accountNumber}"`);
    }
    const debit = parseFloat(row.debit);
    const credit = parseFloat(row.credit);
    if (isNaN(debit) || isNaN(credit)) {
      errors.push(`Row ${i + 2}: invalid debit/credit amounts`);
    }
    if (debit < 0 || credit < 0) {
      errors.push(`Row ${i + 2}: debit and credit must be non-negative`);
    }
  }

  if (errors.length > 0) {
    return errorResponse(
      `CSV validation failed:\n${errors.slice(0, 20).join("\n")}${errors.length > 20 ? `\n...and ${errors.length - 20} more` : ""}`,
      400
    );
  }

  // Group rows by date + description into journal entries
  const entryGroups = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const key = `${row.date}||${row.description}`;
    if (!entryGroups.has(key)) entryGroups.set(key, []);
    entryGroups.get(key)!.push(row);
  }

  // Validate each group balances
  const balanceErrors: string[] = [];
  for (const [key, group] of entryGroups) {
    const totalDebit = group.reduce((sum, r) => sum + parseFloat(r.debit), 0);
    const totalCredit = group.reduce((sum, r) => sum + parseFloat(r.credit), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.005) {
      balanceErrors.push(`Entry "${key.split("||")[1]}" on ${key.split("||")[0]}: debits ($${totalDebit.toFixed(2)}) != credits ($${totalCredit.toFixed(2)})`);
    }
  }

  if (balanceErrors.length > 0) {
    return errorResponse(`Unbalanced entries:\n${balanceErrors.join("\n")}`, 400);
  }

  // Create all entries as DRAFT in a transaction
  const created = await prisma.$transaction(async (tx) => {
    const entries = [];

    for (const [key, group] of entryGroups) {
      const [dateStr, description] = key.split("||");
      const entryNumber = await generateNextEntryNumber(tx, entityId);

      const je = await tx.journalEntry.create({
        data: {
          entityId,
          entryNumber,
          date: new Date(dateStr),
          description,
          status: "DRAFT",
          createdBy: userId,
          lineItems: {
            create: group.map((row, idx) => ({
              accountId: accountMap.get(row.accountNumber)!,
              debit: parseFloat(row.debit),
              credit: parseFloat(row.credit),
              memo: row.memo || null,
              sortOrder: idx,
            })),
          },
        },
      });

      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "IMPORTED",
          userId,
        },
      });

      entries.push({
        id: je.id,
        entryNumber: je.entryNumber,
        date: je.date.toISOString(),
        description: je.description,
        lineCount: group.length,
      });
    }

    return entries;
  });

  return successResponse({ imported: created.length, entries: created }, 201);
}
