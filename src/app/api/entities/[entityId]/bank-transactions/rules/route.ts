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
 * List all categorization rules for this entity.
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
    where: { entityId },
    include: {
      account: { select: { id: true, number: true, name: true } },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return successResponse(
    rules.map((r) => ({
      id: r.id,
      pattern: r.pattern,
      amountMin: serializeDecimal(r.amountMin),
      amountMax: serializeDecimal(r.amountMax),
      accountId: r.accountId,
      account: r.account,
      dimensionTags: r.dimensionTags,
      isActive: r.isActive,
      priority: r.priority,
      createdAt: r.createdAt.toISOString(),
    }))
  );
}

/**
 * POST /api/entities/:entityId/bank-transactions/rules
 *
 * Create a new categorization rule.
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

  // Verify account belongs to this entity
  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, entityId, isActive: true },
    select: { id: true },
  });

  if (!account) {
    return errorResponse("Account not found or does not belong to this entity", 400);
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
      accountId: parsed.data.accountId,
      dimensionTags: parsed.data.dimensionTags ?? Prisma.JsonNull,
      priority: (maxPriority?.priority ?? 0) + 1,
    },
  });

  // Fetch account details for response
  const ruleAccount = await prisma.account.findUnique({
    where: { id: rule.accountId },
    select: { id: true, number: true, name: true },
  });

  return successResponse(
    {
      id: rule.id,
      pattern: rule.pattern,
      amountMin: serializeDecimal(rule.amountMin),
      amountMax: serializeDecimal(rule.amountMax),
      accountId: rule.accountId,
      account: ruleAccount,
      dimensionTags: rule.dimensionTags,
      isActive: rule.isActive,
      priority: rule.priority,
    },
    201
  );
}
