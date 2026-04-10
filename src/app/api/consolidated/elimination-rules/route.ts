import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import {
  successResponse,
  errorResponse,
} from "@/lib/validators/api-response";
import {
  getAccessibleEntityIds,
  canManageEliminationRule,
} from "@/lib/db/entity-access";
import { createEliminationRuleSchema } from "@/lib/validators/elimination-rule";
import type { SerializedEliminationRule } from "@/types/consolidated";

/**
 * Elimination rules collection API.
 *
 * GET  — list rules visible to user (both entities accessible)
 * POST — create rule (requires OWNER on both entities)
 */

function serializeRule(rule: {
  id: string;
  label: string;
  entityAId: string;
  entityA: { name: string };
  accountAId: string;
  accountA: { number: string; name: string };
  entityBId: string;
  entityB: { name: string };
  accountBId: string;
  accountB: { number: string; name: string };
  isActive: boolean;
  createdAt: Date;
}): SerializedEliminationRule {
  return {
    id: rule.id,
    label: rule.label,
    entityAId: rule.entityAId,
    entityAName: rule.entityA.name,
    accountAId: rule.accountAId,
    accountANumber: rule.accountA.number,
    accountAName: rule.accountA.name,
    entityBId: rule.entityBId,
    entityBName: rule.entityB.name,
    accountBId: rule.accountBId,
    accountBNumber: rule.accountB.number,
    accountBName: rule.accountB.name,
    isActive: rule.isActive,
    createdAt: rule.createdAt.toISOString(),
  };
}

/**
 * GET /api/consolidated/elimination-rules
 *
 * Returns all elimination rules where user has access to both entities.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const accessibleIds = await getAccessibleEntityIds(userId);
  if (accessibleIds.length === 0) {
    return successResponse({ data: [] });
  }

  const rules = await prisma.eliminationRule.findMany({
    where: {
      entityAId: { in: accessibleIds },
      entityBId: { in: accessibleIds },
    },
    include: {
      entityA: { select: { name: true } },
      accountA: { select: { number: true, name: true } },
      entityB: { select: { name: true } },
      accountB: { select: { number: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    data: rules.map(serializeRule),
  });
}

/**
 * POST /api/consolidated/elimination-rules
 *
 * Creates a new elimination rule. Requires OWNER role on both entities.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = createEliminationRuleSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { label, entityAId, accountAId, entityBId, accountBId } = result.data;

  // Authorization: user must be Owner on both entities
  const user = await canManageEliminationRule(userId, entityAId, entityBId);
  if (!user) {
    return errorResponse("Must be Owner on both entities", 403);
  }

  // Verify accounts exist and belong to their respective entities
  const [accountA, accountB] = await Promise.all([
    prisma.account.findFirst({
      where: { id: accountAId, entityId: entityAId },
    }),
    prisma.account.findFirst({
      where: { id: accountBId, entityId: entityBId },
    }),
  ]);

  if (!accountA) {
    return errorResponse("Account A not found in Entity A", 400);
  }
  if (!accountB) {
    return errorResponse("Account B not found in Entity B", 400);
  }

  const rule = await prisma.eliminationRule.create({
    data: {
      label,
      entityAId,
      accountAId,
      entityBId,
      accountBId,
      createdBy: user.id,
    },
    include: {
      entityA: { select: { name: true } },
      accountA: { select: { number: true, name: true } },
      entityB: { select: { name: true } },
      accountB: { select: { number: true, name: true } },
    },
  });

  return successResponse({ data: serializeRule(rule) }, 201);
}
