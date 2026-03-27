import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import {
  getTrialBalance,
  getConsolidatedTrialBalance,
} from "@/lib/queries/trial-balance-queries";

// ─── Validation ─────────────────────────────────────────

const querySchema = z.object({
  asOfDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "asOfDate must be a valid date string",
  }),
  consolidated: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
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
  });

  if (!parsed.success) {
    return errorResponse("Invalid parameters", 400, parsed.error);
  }

  const { asOfDate, consolidated } = parsed.data;
  const asOfDateObj = new Date(asOfDate);

  try {
    if (consolidated) {
      // Get all entity IDs the user has access to
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (!user) {
        return errorResponse("User not found", 404);
      }

      const entities = await prisma.entity.findMany({
        where: { createdById: user.id, isActive: true },
        select: { id: true },
      });
      const entityIds = entities.map((e) => e.id);

      const rows = await getConsolidatedTrialBalance(entityIds, asOfDateObj);
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
    const rows = await getTrialBalance(entityId, asOfDateObj);
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
