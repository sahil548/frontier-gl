import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { applyTemplate } from "@/lib/accounts/template";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * Find the internal user and verify entity ownership.
 */
async function findOwnedEntity(entityId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (!user) return null;

  return prisma.entity.findFirst({
    where: { id: entityId, createdById: user.id, isActive: true },
  });
}

/**
 * POST /api/entities/:entityId/accounts/template
 *
 * Applies the Family Office Standard template to the entity.
 * Skips accounts whose number already exists (merge logic).
 * Returns { inserted, skipped } counts.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
  const entity = await findOwnedEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  try {
    const result = await applyTemplate(entityId);
    return successResponse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply template";
    return errorResponse(message, 500);
  }
}
