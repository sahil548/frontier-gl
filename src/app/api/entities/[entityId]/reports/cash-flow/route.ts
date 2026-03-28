import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getCashFlowStatement } from "@/lib/queries/report-queries";

// ─── Validation ─────────────────────────────────────────

const querySchema = z.object({
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "startDate must be a valid date string",
  }),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "endDate must be a valid date string",
  }),
});

// ─── GET: Cash Flow Statement ───────────────────────────

/**
 * GET /api/entities/:entityId/reports/cash-flow
 *
 * Query params:
 *   startDate — ISO date string (required)
 *   endDate   — ISO date string (required)
 *
 * Returns cash flow statement data with operating, investing,
 * and financing sections plus beginning/ending cash balances.
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
    const data = await getCashFlowStatement(
      entityId,
      new Date(startDate),
      new Date(endDate)
    );

    return successResponse(data);
  } catch (error) {
    console.error("Cash flow statement error:", error);
    return errorResponse("Failed to fetch cash flow statement", 500);
  }
}
