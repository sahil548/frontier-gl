import { auth } from "@clerk/nextjs/server";
import { applyTemplate } from "@/lib/accounts/template";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

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
  const entity = await findAccessibleEntity(entityId, userId);
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
