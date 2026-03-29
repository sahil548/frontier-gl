import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { createTagSchema } from "@/lib/validators/dimension";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * GET /api/entities/:entityId/dimensions/:dimensionId/tags
 *
 * List tags for a dimension.
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
  });
  if (!dimension) {
    return errorResponse("Dimension not found", 404);
  }

  const tags = await prisma.dimensionTag.findMany({
    where: { dimensionId },
    orderBy: { sortOrder: "asc" },
  });

  return successResponse(tags);
}

/**
 * POST /api/entities/:entityId/dimensions/:dimensionId/tags
 *
 * Create a new tag within a dimension.
 */
export async function POST(
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

  const dimension = await prisma.dimension.findFirst({
    where: { id: dimensionId, entityId },
  });
  if (!dimension) {
    return errorResponse("Dimension not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = createTagSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  // Check for duplicate code within dimension
  const existingCode = await prisma.dimensionTag.findUnique({
    where: {
      dimensionId_code: { dimensionId, code: result.data.code },
    },
  });
  if (existingCode) {
    return errorResponse(
      `Tag code "${result.data.code}" already exists in this dimension`,
      400
    );
  }

  // Check for duplicate name within dimension
  const existingName = await prisma.dimensionTag.findUnique({
    where: {
      dimensionId_name: { dimensionId, name: result.data.name },
    },
  });
  if (existingName) {
    return errorResponse(
      `Tag name "${result.data.name}" already exists in this dimension`,
      400
    );
  }

  const tag = await prisma.dimensionTag.create({
    data: {
      dimensionId,
      code: result.data.code,
      name: result.data.name,
      description: result.data.description,
    },
  });

  return successResponse(tag, 201);
}
