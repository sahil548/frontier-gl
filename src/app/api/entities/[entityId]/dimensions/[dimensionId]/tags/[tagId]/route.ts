import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { updateTagSchema } from "@/lib/validators/dimension";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * PUT /api/entities/:entityId/dimensions/:dimensionId/tags/:tagId
 *
 * Update a tag (code, name, description, isActive, sortOrder).
 */
export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      entityId: string;
      dimensionId: string;
      tagId: string;
    }>;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, dimensionId, tagId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const existing = await prisma.dimensionTag.findFirst({
    where: { id: tagId, dimensionId },
    include: { dimension: true },
  });
  if (!existing || existing.dimension.entityId !== entityId) {
    return errorResponse("Tag not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = updateTagSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  // Check for duplicate code if changing
  if (result.data.code && result.data.code !== existing.code) {
    const duplicate = await prisma.dimensionTag.findUnique({
      where: {
        dimensionId_code: { dimensionId, code: result.data.code },
      },
    });
    if (duplicate) {
      return errorResponse(
        `Tag code "${result.data.code}" already exists in this dimension`,
        400
      );
    }
  }

  // Check for duplicate name if changing
  if (result.data.name && result.data.name !== existing.name) {
    const duplicate = await prisma.dimensionTag.findUnique({
      where: {
        dimensionId_name: { dimensionId, name: result.data.name },
      },
    });
    if (duplicate) {
      return errorResponse(
        `Tag name "${result.data.name}" already exists in this dimension`,
        400
      );
    }
  }

  const tag = await prisma.dimensionTag.update({
    where: { id: tagId },
    data: result.data,
  });

  return successResponse(tag);
}

/**
 * DELETE /api/entities/:entityId/dimensions/:dimensionId/tags/:tagId
 *
 * Soft delete -- sets isActive=false on the tag.
 */
export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      entityId: string;
      dimensionId: string;
      tagId: string;
    }>;
  }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, dimensionId, tagId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const existing = await prisma.dimensionTag.findFirst({
    where: { id: tagId, dimensionId },
    include: { dimension: true },
  });
  if (!existing || existing.dimension.entityId !== entityId) {
    return errorResponse("Tag not found", 404);
  }

  await prisma.dimensionTag.update({
    where: { id: tagId },
    data: { isActive: false },
  });

  return successResponse({ id: tagId, isActive: false });
}
