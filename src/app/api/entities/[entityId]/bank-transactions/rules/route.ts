import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { categorizationRuleSchema } from "@/validators/bank-transaction";
import { Prisma } from "@/generated/prisma/client";

// ---- Serialization Helper -------------------------------------------------

function serializeDecimal(val: Prisma.Decimal | null): string | null {
  if (val === null) return null;
  return val.toString();
}

/**
 * GET /api/entities/:entityId/bank-transactions/rules
 *
 * List all active categorization rules for this entity.
 * Includes account relation and matched transaction count.
 */
export async function GET(
  _request: Request,
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

  const rules = await prisma.categorizationRule.findMany({
    where: { entityId, isActive: true },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      _count: { select: { bankTransactions: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });

  return successResponse(
    rules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      amountMin: serializeDecimal(r.amountMin),
      amountMax: serializeDecimal(r.amountMax),
      accountId: r.accountId,
      positionId: r.positionId,
      account: r.account,
      dimensionTags: r.dimensionTags,
      isActive: r.isActive,
      priority: r.priority,
      matchedCount: r._count.bankTransactions,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

/**
 * POST /api/entities/:entityId/bank-transactions/rules
 *
 * Create a new categorization rule.
 * Optionally retroactively matches existing PENDING transactions.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = categorizationRuleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  // Verify account belongs to this entity (if provided)
  let account: { id: string; number: string; name: string } | null = null;
  if (parsed.data.accountId) {
    account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, entityId, isActive: true },
      select: { id: true, number: true, name: true },
    });

    if (!account) {
      return errorResponse("Account not found or does not belong to this entity", 400);
    }
  }

  // Verify position belongs to this entity (if provided)
  if (parsed.data.positionId) {
    const position = await prisma.position.findFirst({
      where: {
        id: parsed.data.positionId,
        subledgerItem: { entityId, isActive: true },
        isActive: true,
      },
    });
    if (!position) {
      return errorResponse("Position not found or does not belong to this entity", 400);
    }
  }

  // Verify dimension tags if provided
  if (parsed.data.dimensionTags) {
    for (const [dimensionId, tagId] of Object.entries(parsed.data.dimensionTags)) {
      const tag = await prisma.dimensionTag.findFirst({
        where: {
          id: tagId,
          dimensionId,
          dimension: { entityId },
          isActive: true,
        },
      });
      if (!tag) {
        return errorResponse(`Invalid dimension tag: ${tagId} for dimension ${dimensionId}`, 400);
      }
    }
  }

  // Get next priority (highest + 1)
  const maxPriority = await prisma.categorizationRule.findFirst({
    where: { entityId },
    orderBy: { priority: "desc" },
    select: { priority: true },
  });

  const rule = await prisma.categorizationRule.create({
    data: {
      entityId,
      pattern: parsed.data.pattern,
      amountMin: parsed.data.amountMin ? new Prisma.Decimal(String(parsed.data.amountMin)) : null,
      amountMax: parsed.data.amountMax ? new Prisma.Decimal(String(parsed.data.amountMax)) : null,
      accountId: parsed.data.accountId ?? null,
      positionId: parsed.data.positionId ?? null,
      dimensionTags: parsed.data.dimensionTags ?? Prisma.JsonNull,
      priority: (maxPriority?.priority ?? 0) + 1,
    },
  });

  // Retroactively match existing PENDING transactions for this entity
  const patternLower = parsed.data.pattern.toLowerCase();
  const pendingTxns = await prisma.bankTransaction.findMany({
    where: {
      subledgerItem: { account: { entityId } },
      status: "PENDING",
      accountId: null,
    },
    select: { id: true, description: true, amount: true },
  });

  let matchedCount = 0;
  const matchedIds: string[] = [];
  for (const txn of pendingTxns) {
    if (!txn.description.toLowerCase().includes(patternLower)) continue;

    // Check amount range
    const absAmount = Math.abs(txn.amount.toNumber());
    if (parsed.data.amountMin !== undefined && absAmount < parsed.data.amountMin) continue;
    if (parsed.data.amountMax !== undefined && absAmount > parsed.data.amountMax) continue;

    matchedIds.push(txn.id);
    matchedCount++;
  }

  // Batch update matched transactions
  if (matchedIds.length > 0) {
    await prisma.bankTransaction.updateMany({
      where: { id: { in: matchedIds } },
      data: {
        accountId: parsed.data.accountId ?? null,
        positionId: parsed.data.positionId ?? null,
        ruleId: rule.id,
        status: "CATEGORIZED",
      },
    });
  }

  return successResponse(
    {
      id: rule.id,
      pattern: rule.pattern,
      amountMin: serializeDecimal(rule.amountMin),
      amountMax: serializeDecimal(rule.amountMax),
      accountId: rule.accountId,
      account,
      dimensionTags: rule.dimensionTags,
      isActive: rule.isActive,
      priority: rule.priority,
      matchedCount,
    },
    201
  );
}
