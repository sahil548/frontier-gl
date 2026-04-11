import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ---- Serialization Helper -------------------------------------------------

function serializeDecimal(val: Prisma.Decimal | null): string | null {
  if (val === null) return null;
  return val.toString();
}

// Partial update schema: all fields optional
const updateRuleSchema = z.object({
  pattern: z.string().min(1).optional(),
  amountMin: z.number().optional().nullable(),
  amountMax: z.number().optional().nullable(),
  accountId: z.string().min(1).optional(),
  dimensionTags: z.record(z.string(), z.string()).optional().nullable(),
});

/**
 * PATCH /api/entities/:entityId/bank-transactions/rules/:ruleId
 *
 * Update an existing categorization rule.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string; ruleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, ruleId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
  });
  if (!access) return errorResponse("Entity not found", 403);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  // Verify rule belongs to this entity
  const existingRule = await prisma.categorizationRule.findFirst({
    where: { id: ruleId, entityId, isActive: true },
  });
  if (!existingRule) {
    return errorResponse("Rule not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = updateRuleSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  // If accountId is being updated, verify it belongs to this entity
  if (parsed.data.accountId) {
    const account = await prisma.account.findFirst({
      where: { id: parsed.data.accountId, entityId, isActive: true },
      select: { id: true },
    });
    if (!account) {
      return errorResponse("Account not found or does not belong to this entity", 400);
    }
  }

  // Build update data
  const updateData: Prisma.CategorizationRuleUpdateInput = {};
  if (parsed.data.pattern !== undefined) updateData.pattern = parsed.data.pattern;
  if (parsed.data.accountId !== undefined) {
    updateData.account = { connect: { id: parsed.data.accountId } };
  }
  if (parsed.data.amountMin !== undefined) {
    updateData.amountMin = parsed.data.amountMin !== null
      ? new Prisma.Decimal(String(parsed.data.amountMin))
      : null;
  }
  if (parsed.data.amountMax !== undefined) {
    updateData.amountMax = parsed.data.amountMax !== null
      ? new Prisma.Decimal(String(parsed.data.amountMax))
      : null;
  }
  if (parsed.data.dimensionTags !== undefined) {
    updateData.dimensionTags = parsed.data.dimensionTags ?? Prisma.JsonNull;
  }

  const updated = await prisma.categorizationRule.update({
    where: { id: ruleId },
    data: updateData,
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
    },
  });

  return successResponse({
    id: updated.id,
    pattern: updated.pattern,
    amountMin: serializeDecimal(updated.amountMin),
    amountMax: serializeDecimal(updated.amountMax),
    accountId: updated.accountId,
    account: updated.account,
    dimensionTags: updated.dimensionTags,
    isActive: updated.isActive,
    priority: updated.priority,
  });
}

/**
 * DELETE /api/entities/:entityId/bank-transactions/rules/:ruleId
 *
 * Soft delete a categorization rule (set isActive = false).
 * Does NOT remove accountId from already-categorized transactions.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; ruleId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, ruleId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
  });
  if (!access) return errorResponse("Entity not found", 403);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  // Verify rule belongs to this entity
  const existingRule = await prisma.categorizationRule.findFirst({
    where: { id: ruleId, entityId, isActive: true },
  });
  if (!existingRule) {
    return errorResponse("Rule not found", 404);
  }

  await prisma.categorizationRule.update({
    where: { id: ruleId },
    data: { isActive: false },
  });

  return successResponse({ success: true });
}
