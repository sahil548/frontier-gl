import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { findAccessibleEntity } from "@/lib/db/entity-access";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { z } from "zod";

/**
 * GET /api/entities/:entityId/column-mappings
 *
 * Returns all saved column mappings for the entity.
 * Optionally filter by ?importType=bank|coa|budget.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Not authenticated", 401);

  const { entityId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) return errorResponse("Entity not found", 404);

  const url = new URL(request.url);
  const importTypeParam = url.searchParams.get("importType");
  const allowedTypes = new Set(["bank", "coa", "budget"]);
  const importType =
    importTypeParam && allowedTypes.has(importTypeParam)
      ? importTypeParam
      : undefined;

  const mappings = await prisma.columnMapping.findMany({
    where: importType ? { entityId, importType } : { entityId },
    orderBy: { updatedAt: "desc" },
  });

  return successResponse(
    mappings.map((m) => ({
      id: m.id,
      sourceName: m.sourceName,
      importType: m.importType,
      mapping: m.mapping,
      updatedAt: m.updatedAt.toISOString(),
    }))
  );
}

const saveSchema = z.object({
  sourceName: z.string().min(1),
  importType: z.enum(["bank", "coa", "budget"]),
  mapping: z.record(z.string(), z.string()),
});

/**
 * POST /api/entities/:entityId/column-mappings
 *
 * Saves a confirmed column mapping for reuse. Upserts by entity+source+type.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Not authenticated", 401);

  const { entityId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) return errorResponse("Entity not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request", 400);
  }

  const { sourceName, importType, mapping } = parsed.data;

  const saved = await prisma.columnMapping.upsert({
    where: {
      entityId_sourceName_importType: {
        entityId,
        sourceName,
        importType,
      },
    },
    create: {
      entityId,
      sourceName,
      importType,
      mapping,
    },
    update: {
      mapping,
    },
  });

  return successResponse({
    id: saved.id,
    sourceName: saved.sourceName,
    importType: saved.importType,
    mapping: saved.mapping,
  });
}
