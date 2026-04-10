import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getAccessibleEntityIds } from "@/lib/db/entity-access";
import { getConsolidatedBalanceSheet } from "@/lib/queries/consolidated-report-queries";

// --- Validation ---

const querySchema = z.object({
  entityIds: z
    .string()
    .transform((s) => s.split(","))
    .pipe(z.array(z.string().min(1)).min(1)),
  asOfDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "asOfDate must be a valid date string",
  }),
  basis: z.enum(["accrual", "cash"]).optional(),
});

// --- GET: Consolidated Balance Sheet ---

/**
 * GET /api/consolidated/reports/balance-sheet
 *
 * Query params:
 *   entityIds - comma-separated entity IDs (required)
 *   asOfDate  - ISO date string (required)
 *   basis     - 'accrual' | 'cash' (optional, default: accrual)
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    entityIds: url.searchParams.get("entityIds"),
    asOfDate: url.searchParams.get("asOfDate"),
    basis: url.searchParams.get("basis") ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { entityIds, asOfDate } = parsed.data;

  // Authorization: verify user has access to all requested entities
  const accessibleIds = await getAccessibleEntityIds(userId);
  const accessibleSet = new Set(accessibleIds);
  const unauthorized = entityIds.filter((id) => !accessibleSet.has(id));
  if (unauthorized.length > 0) {
    return errorResponse("Access denied to one or more entities", 403);
  }

  try {
    const data = await getConsolidatedBalanceSheet(
      entityIds,
      new Date(asOfDate),
      parsed.data.basis ?? "accrual"
    );

    return successResponse(data);
  } catch (error) {
    console.error("Consolidated balance sheet error:", error);
    return errorResponse("Internal server error", 500);
  }
}
