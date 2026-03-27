import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { updateEntitySchema } from "@/lib/validators/entity";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { serializeEntity } from "@/lib/utils/serialization";

/**
 * Single entity management API routes.
 *
 * These routes operate on a specific entity by ID.
 * Ownership is verified: the entity must belong to the authenticated user.
 *
 * Note: This is /api/entities/:entityId (entity management).
 * The /api/entities/:entityId/ scoping for financial data within an entity
 * (accounts, journal entries) is a separate pattern for Phase 2.
 */

/**
 * Find an entity by ID and verify it belongs to the user.
 * Returns the entity or null if not found / not owned.
 */
async function findOwnedEntity(entityId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) return null;

  return prisma.entity.findFirst({
    where: {
      id: entityId,
      createdById: user.id,
    },
  });
}

/**
 * GET /api/entities/:entityId
 *
 * Returns a single entity by ID.
 * Returns 404 if not found or not owned by the authenticated user.
 */
export async function GET(
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

  return successResponse(serializeEntity(entity));
}

/**
 * PUT /api/entities/:entityId
 *
 * Updates an entity with Zod-validated input.
 * Supports partial updates including deactivation via { isActive: false }.
 * Returns 404 if not found or not owned by the authenticated user.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = updateEntitySchema.safeParse(body);

  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { entityId } = await params;
  const entity = await findOwnedEntity(entityId, userId);

  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const updated = await prisma.entity.update({
    where: { id: entityId },
    data: result.data,
  });

  return successResponse(serializeEntity(updated));
}
