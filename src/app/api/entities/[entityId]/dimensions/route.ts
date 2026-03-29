import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { createDimensionSchema } from "@/lib/validators/dimension";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * GET /api/entities/:entityId/dimensions
 *
 * List all dimensions with their tags for the entity.
 * By default returns only active dimensions/tags. Pass ?all=true for inactive too.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const url = new URL(request.url);
  const showAll = url.searchParams.get("all") === "true";

  const dimensions = await prisma.dimension.findMany({
    where: {
      entityId,
      ...(showAll ? {} : { isActive: true }),
    },
    include: {
      tags: {
        where: showAll ? {} : { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return successResponse(dimensions);
}

/**
 * POST /api/entities/:entityId/dimensions
 *
 * Create a new dimension for the entity.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
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

  const result = createDimensionSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  // Check for duplicate name within entity
  const existing = await prisma.dimension.findUnique({
    where: { entityId_name: { entityId, name: result.data.name } },
  });
  if (existing) {
    return errorResponse(
      `Dimension "${result.data.name}" already exists for this entity`,
      400
    );
  }

  const dimension = await prisma.dimension.create({
    data: {
      entityId,
      name: result.data.name,
    },
    include: { tags: true },
  });

  return successResponse(dimension, 201);
}
