import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import {
  successResponse,
  errorResponse,
} from "@/lib/validators/api-response";
import { canManageEliminationRule } from "@/lib/db/entity-access";
import { updateEliminationRuleSchema } from "@/lib/validators/elimination-rule";
import type { SerializedEliminationRule } from "@/types/consolidated";

/**
 * Single elimination rule API.
 *
 * PATCH  — update rule fields or toggle active/inactive
 * DELETE — soft-delete (set isActive = false)
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
 * PATCH /api/consolidated/elimination-rules/:ruleId
 *
 * Updates an elimination rule. Requires OWNER on both entities (current + new if changing).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { ruleId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = updateEliminationRuleSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  // Fetch existing rule
  const existing = await prisma.eliminationRule.findUnique({
    where: { id: ruleId },
  });
  if (!existing) {
    return errorResponse("Elimination rule not found", 404);
  }

  // Check Owner on current entities
  const user = await canManageEliminationRule(
    userId,
    existing.entityAId,
    existing.entityBId
  );
  if (!user) {
    return errorResponse("Must be Owner on both entities", 403);
  }

  // If entity IDs are changing, also verify Owner on new entities
  const { entityAId, entityBId, ...rest } = result.data;
  const newEntityAId = entityAId ?? existing.entityAId;
  const newEntityBId = entityBId ?? existing.entityBId;

  if (entityAId || entityBId) {
    if (newEntityAId === newEntityBId) {
      return errorResponse(
        "Elimination rule must span two different entities",
        400
      );
    }
    const newUser = await canManageEliminationRule(
      userId,
      newEntityAId,
      newEntityBId
    );
    if (!newUser) {
      return errorResponse("Must be Owner on both new entities", 403);
    }
  }

  const updated = await prisma.eliminationRule.update({
    where: { id: ruleId },
    data: {
      ...rest,
      ...(entityAId && { entityAId }),
      ...(entityBId && { entityBId }),
    },
    include: {
      entityA: { select: { name: true } },
      accountA: { select: { number: true, name: true } },
      entityB: { select: { name: true } },
      accountB: { select: { number: true, name: true } },
    },
  });

  return successResponse({ data: serializeRule(updated) });
}

/**
 * DELETE /api/consolidated/elimination-rules/:ruleId
 *
 * Soft-deletes an elimination rule by setting isActive = false.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { ruleId } = await params;

  const existing = await prisma.eliminationRule.findUnique({
    where: { id: ruleId },
  });
  if (!existing) {
    return errorResponse("Elimination rule not found", 404);
  }

  const user = await canManageEliminationRule(
    userId,
    existing.entityAId,
    existing.entityBId
  );
  if (!user) {
    return errorResponse("Must be Owner on both entities", 403);
  }

  await prisma.eliminationRule.update({
    where: { id: ruleId },
    data: { isActive: false },
  });

  return successResponse({ data: { id: ruleId, isActive: false } });
}
