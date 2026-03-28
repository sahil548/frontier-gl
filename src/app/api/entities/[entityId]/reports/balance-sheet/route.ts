import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getBalanceSheet } from "@/lib/queries/report-queries";

// ─── Validation ─────────────────────────────────────────

const querySchema = z.object({
  asOfDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "asOfDate must be a valid date string",
  }),
});

// ─── GET: Balance Sheet ─────────────────────────────────

/**
 * GET /api/entities/:entityId/reports/balance-sheet
 *
 * Query params:
 *   asOfDate — ISO date string (required)
 *
 * Returns balance sheet data with asset/liability/equity rows and totals.
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
    asOfDate: url.searchParams.get("asOfDate"),
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { asOfDate } = parsed.data;

  try {
    const data = await getBalanceSheet(entityId, new Date(asOfDate));

    return successResponse(data);
  } catch (error) {
    console.error("Balance sheet error:", error);
    return errorResponse("Failed to fetch balance sheet", 500);
  }
}
