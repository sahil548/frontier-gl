import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { csvImportSchema } from "@/validators/bank-transaction";
import { parseBankStatementCsv } from "@/lib/bank-transactions/csv-parser";
import { generateTransactionHash, findDuplicates } from "@/lib/bank-transactions/duplicate-check";
import { matchRule } from "@/lib/bank-transactions/categorize";
import { Prisma } from "@/generated/prisma/client";

// ---- Serialization Helpers ------------------------------------------------

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

function serializeTransaction(t: Record<string, unknown>) {
  const txn = t as {
    id: string;
    subledgerItemId: string;
    externalId: string | null;
    date: Date;
    description: string;
    amount: Prisma.Decimal;
    originalDescription: string | null;
    merchantName: string | null;
    category: string | null;
    source: string;
    status: string;
    accountId: string | null;
    ruleId: string | null;
    isSplit: boolean;
    parentTransactionId: string | null;
    reconciliationStatus: string;
    journalEntryId: string | null;
    createdAt: Date;
    updatedAt: Date;
    account?: { id: string; number: string; name: string } | null;
    rule?: { id: string; pattern: string } | null;
  };

  return {
    id: txn.id,
    subledgerItemId: txn.subledgerItemId,
    externalId: txn.externalId,
    date: txn.date.toISOString(),
    description: txn.description,
    amount: serializeDecimal(txn.amount),
    originalDescription: txn.originalDescription,
    merchantName: txn.merchantName,
    category: txn.category,
    source: txn.source,
    status: txn.status,
    accountId: txn.accountId,
    ruleId: txn.ruleId,
    isSplit: txn.isSplit,
    parentTransactionId: txn.parentTransactionId,
    reconciliationStatus: txn.reconciliationStatus,
    journalEntryId: txn.journalEntryId,
    createdAt: txn.createdAt.toISOString(),
    updatedAt: txn.updatedAt.toISOString(),
    account: txn.account
      ? { id: txn.account.id, number: txn.account.number, name: txn.account.name }
      : null,
    rule: txn.rule
      ? { id: txn.rule.id, pattern: txn.rule.pattern }
      : null,
  };
}

// ---- GET: List bank transactions ------------------------------------------

export async function GET(
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

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const subledgerItemId = url.searchParams.get("subledgerItemId");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  // Build where clause scoped to entity via subledger items
  const where: Prisma.BankTransactionWhereInput = {
    subledgerItem: { entityId },
  };

  if (status && ["PENDING", "CATEGORIZED", "POSTED", "EXCLUDED"].includes(status)) {
    where.status = status as "PENDING" | "CATEGORIZED" | "POSTED" | "EXCLUDED";
  }

  if (subledgerItemId) {
    where.subledgerItemId = subledgerItemId;
  }

  const [transactions, total] = await Promise.all([
    prisma.bankTransaction.findMany({
      where,
      include: {
        account: { select: { id: true, number: true, name: true } },
        rule: { select: { id: true, pattern: true } },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.bankTransaction.count({ where }),
  ]);

  return successResponse({
    transactions: transactions.map((t) =>
      serializeTransaction(t as unknown as Record<string, unknown>)
    ),
    total,
    page,
    limit,
  });
}

// ---- POST: CSV Import -----------------------------------------------------

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = csvImportSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  const { csv, subledgerItemId } = parsed.data;

  // Verify subledger item belongs to this entity and is a BANK_ACCOUNT
  const subledgerItem = await prisma.subledgerItem.findFirst({
    where: { id: subledgerItemId, entityId, itemType: "BANK_ACCOUNT" },
    select: { id: true, accountId: true },
  });

  if (!subledgerItem) {
    return errorResponse(
      "Subledger item not found or is not a bank account for this entity",
      400
    );
  }

  // Parse CSV
  let rows;
  try {
    rows = parseBankStatementCsv(csv);
  } catch (err) {
    return errorResponse(
      `CSV parsing failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      400
    );
  }

  if (rows.length === 0) {
    return errorResponse("CSV contains no valid data rows", 400);
  }

  // Generate hashes and check for duplicates
  const hashMap = new Map<string, (typeof rows)[number]>();
  const hashList: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hash = generateTransactionHash(
      row.date,
      String(row.amount),
      row.description,
      i
    );
    hashMap.set(hash, row);
    hashList.push(hash);
  }

  const existingHashes = await findDuplicates(subledgerItemId, hashList);
  const skipped = existingHashes.size;

  // Fetch active categorization rules for this entity
  const rules = await prisma.categorizationRule.findMany({
    where: { entityId, isActive: true },
    orderBy: { priority: "asc" },
  });

  // Create new transactions, auto-categorize if rule matches
  const errors: string[] = [];
  let imported = 0;
  let categorized = 0;

  const createOperations: Prisma.BankTransactionCreateManyInput[] = [];

  for (const [hash, row] of hashMap.entries()) {
    if (existingHashes.has(hash)) continue;

    // Try to match a categorization rule
    const matchedRule = matchRule(
      { description: row.description, amount: row.amount },
      rules.map((r) => ({
        id: r.id,
        pattern: r.pattern,
        amountMin: r.amountMin,
        amountMax: r.amountMax,
        accountId: r.accountId,
        dimensionTags: r.dimensionTags,
        isActive: r.isActive,
        priority: r.priority,
      }))
    );

    try {
      createOperations.push({
        subledgerItemId,
        externalId: hash,
        date: new Date(row.date),
        description: row.description,
        amount: new Prisma.Decimal(String(row.amount)),
        source: "CSV",
        status: matchedRule ? "CATEGORIZED" : "PENDING",
        accountId: matchedRule ? matchedRule.accountId : null,
        ruleId: matchedRule ? matchedRule.id : null,
      });

      imported++;
      if (matchedRule) categorized++;
    } catch (err) {
      errors.push(
        `Row "${row.description}": ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  if (createOperations.length > 0) {
    await prisma.bankTransaction.createMany({ data: createOperations });
  }

  return successResponse({
    imported,
    skipped,
    categorized,
    errors,
  });
}
