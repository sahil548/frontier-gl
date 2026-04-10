import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { findAccessibleEntity } from "@/lib/db/entity-access";
import { getBudgetVsActual } from "@/lib/queries/report-queries";

// --- Validation ---

const querySchema = z.object({
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "startDate must be a valid date string",
  }),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "endDate must be a valid date string",
  }),
});

// --- GET: Budget vs Actual Report ---

/**
 * GET /api/entities/:entityId/reports/budget-vs-actual
 *
 * Query params:
 *   startDate - ISO date string (required)
 *   endDate   - ISO date string (required)
 *
 * Returns budget vs actual data with income/expense rows,
 * section totals, and net income variance.
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
    return errorResponse("Entity not found or access denied", 403);
  }

  // Parse query params
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    startDate: url.searchParams.get("startDate"),
    endDate: url.searchParams.get("endDate"),
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { startDate, endDate } = parsed.data;

  try {
    const data = await getBudgetVsActual(
      entityId,
      new Date(startDate),
      new Date(endDate)
    );

    return successResponse(data);
  } catch (error) {
    console.error("Budget vs actual report error:", error);
    return errorResponse("Failed to fetch budget vs actual report", 500);
  }
}
