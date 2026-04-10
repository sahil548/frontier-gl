import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getAccessibleEntityIds } from "@/lib/db/entity-access";
import { getConsolidatedCashFlow } from "@/lib/queries/consolidated-report-queries";

// --- Validation ---

const querySchema = z.object({
  entityIds: z
    .string()
    .transform((s) => s.split(","))
    .pipe(z.array(z.string().min(1)).min(1)),
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "startDate must be a valid date string",
  }),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "endDate must be a valid date string",
  }),
});

// --- GET: Consolidated Cash Flow ---

/**
 * GET /api/consolidated/reports/cash-flow
 *
 * Query params:
 *   entityIds - comma-separated entity IDs (required)
 *   startDate - ISO date string (required)
 *   endDate   - ISO date string (required)
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    entityIds: url.searchParams.get("entityIds"),
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate"),
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { entityIds, startDate, endDate } = parsed.data;

  // Authorization: verify user has access to all requested entities
  const accessibleIds = await getAccessibleEntityIds(userId);
  const accessibleSet = new Set(accessibleIds);
  const unauthorized = entityIds.filter((id) => !accessibleSet.has(id));
  if (unauthorized.length > 0) {
    return errorResponse("Access denied to one or more entities", 403);
  }

  try {
    const data = await getConsolidatedCashFlow(
      entityIds,
      new Date(startDate),
      new Date(endDate)
    );

    return successResponse(data);
  } catch (error) {
    console.error("Consolidated cash flow error:", error);
    return errorResponse("Internal server error", 500);
  }
}
