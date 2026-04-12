import { auth } from "@clerk/nextjs/server";
import { applyTemplate } from "@/lib/accounts/template";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * POST /api/entities/:entityId/accounts/template
 *
 * Applies a COA template to the entity.
 * Accepts optional { templateName } in body ("family_office" | "hedge_fund").
 * Defaults to "family_office" if not provided.
 * Skips accounts whose number already exists (merge logic).
 * Returns { inserted, skipped } counts.
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

  // Parse optional template name from body
  let templateName: "family_office" | "hedge_fund" = "family_office";
  try {
    const body = await request.json();
    if (body.templateName === "hedge_fund") {
      templateName = "hedge_fund";
    }
  } catch {
    // No body or invalid JSON -- use default
  }

  try {
    const result = await applyTemplate(entityId, templateName);
    return successResponse(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to apply template";
    return errorResponse(message, 500);
  }
}
