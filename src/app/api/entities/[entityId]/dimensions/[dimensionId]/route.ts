import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { updateDimensionSchema } from "@/lib/validators/dimension";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * GET /api/entities/:entityId/dimensions/:dimensionId
 *
 * Get a single dimension with its tags.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; dimensionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, dimensionId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const dimension = await prisma.dimension.findFirst({
    where: { id: dimensionId, entityId },
    include: {
      tags: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!dimension) {
    return errorResponse("Dimension not found", 404);
  }

  return successResponse(dimension);
}

/**
 * PUT /api/entities/:entityId/dimensions/:dimensionId
 *
 * Update dimension (name, isActive, sortOrder).
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string; dimensionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, dimensionId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = updateDimensionSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const existing = await prisma.dimension.findFirst({
    where: { id: dimensionId, entityId },
  });
  if (!existing) {
    return errorResponse("Dimension not found", 404);
  }

  // Check for duplicate name if name is being changed
  if (result.data.name && result.data.name !== existing.name) {
    const duplicate = await prisma.dimension.findUnique({
      where: { entityId_name: { entityId, name: result.data.name } },
    });
    if (duplicate) {
      return errorResponse(
        `Dimension "${result.data.name}" already exists for this entity`,
        400
      );
    }
  }

  const dimension = await prisma.dimension.update({
    where: { id: dimensionId },
    data: result.data,
    include: {
      tags: { orderBy: { sortOrder: "asc" } },
    },
  });

  return successResponse(dimension);
}

/**
 * DELETE /api/entities/:entityId/dimensions/:dimensionId
 *
 * Soft delete -- sets isActive=false on dimension and all child tags.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; dimensionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, dimensionId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const existing = await prisma.dimension.findFirst({
    where: { id: dimensionId, entityId },
  });
  if (!existing) {
    return errorResponse("Dimension not found", 404);
  }

  // Deactivate dimension and all its tags in a transaction
  await prisma.$transaction([
    prisma.dimensionTag.updateMany({
      where: { dimensionId },
      data: { isActive: false },
    }),
    prisma.dimension.update({
      where: { id: dimensionId },
      data: { isActive: false },
    }),
  ]);

  return successResponse({ id: dimensionId, isActive: false });
}
