import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import {
  getTrialBalance,
  getConsolidatedTrialBalance,
} from "@/lib/queries/trial-balance-queries";
import { getAccessibleEntityIds } from "@/lib/db/entity-access";

// ─── Validation ─────────────────────────────────────────

const dimensionFilterSchema = z.object({
  dimensionId: z.string().min(1),
  tagId: z.string().min(1),
});

const querySchema = z.object({
  asOfDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "asOfDate must be a valid date string",
  }),
  consolidated: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  dimensionFilters: z.string().optional(),
});

// ─── GET: Trial Balance ─────────────────────────────────

/**
 * GET /api/entities/:entityId/trial-balance
 *
 * Query params:
 *   asOfDate     — ISO date string (required)
 *   consolidated — "true" | "false" (optional, default false)
 *
 * Returns trial balance rows with totals and balance verification.
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
    consolidated: url.searchParams.get("consolidated") ?? undefined,
    dimensionFilters: url.searchParams.get("dimensionFilters") ?? undefined,
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { asOfDate, consolidated } = parsed.data;
  const asOfDateObj = new Date(asOfDate);

  // Parse dimension filters if provided
  let dimensionFilters: Array<{ dimensionId: string; tagId: string }> | undefined;
  if (parsed.data.dimensionFilters) {
    try {
      const raw = JSON.parse(parsed.data.dimensionFilters);
      const filterResult = z.array(dimensionFilterSchema).safeParse(raw);
      if (!filterResult.success) {
        return errorResponse("Invalid dimensionFilters format", 400, filterResult.error);
      }
      dimensionFilters = filterResult.data;
    } catch {
      return errorResponse("dimensionFilters must be valid JSON", 400);
    }
  }

  try {
    if (consolidated) {
      // Get all entity IDs the user has access to
      const entityIds = await getAccessibleEntityIds(userId);

      const rows = await getConsolidatedTrialBalance(entityIds, asOfDateObj, dimensionFilters);
      const totalDebits = rows.reduce((sum, r) => sum + r.totalDebits, 0);
      const totalCredits = rows.reduce((sum, r) => sum + r.totalCredits, 0);
      const inBalance = Math.abs(totalDebits - totalCredits) < 0.005;

      return successResponse({
        rows,
        totalDebits,
        totalCredits,
        inBalance,
        consolidated: true,
      });
    }

    // Single entity
    const rows = await getTrialBalance(entityId, asOfDateObj, dimensionFilters);
    const totalDebits = rows.reduce((sum, r) => sum + r.totalDebits, 0);
    const totalCredits = rows.reduce((sum, r) => sum + r.totalCredits, 0);
    const inBalance = Math.abs(totalDebits - totalCredits) < 0.005;

    return successResponse({
      rows,
      totalDebits,
      totalCredits,
      inBalance,
      consolidated: false,
    });
  } catch (error) {
    console.error("Trial balance error:", error);
    return errorResponse("Failed to fetch trial balance", 500);
  }
}
