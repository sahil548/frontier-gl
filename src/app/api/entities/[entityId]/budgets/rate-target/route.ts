import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { getFiscalYearMonths } from "@/lib/utils/fiscal-year";
import { computeMonthlyBudget } from "@/lib/budgets/rate-based";
import Decimal from "decimal.js";

/**
 * Validation schema for rate-based budget generation request.
 *
 * holdingId: CUID of the SubledgerItem (holding) to source market value from.
 * accountId: CUID of the income account to budget against.
 * annualRate: Target annual return rate as a decimal (0-1, e.g., 0.08 for 8%).
 * fiscalYear: The fiscal year to generate 12 monthly budget lines for.
 */
const rateTargetSchema = z.object({
  holdingId: z.string().cuid(),
  accountId: z.string().cuid(),
  annualRate: z.number().min(0).max(1),
  fiscalYear: z.number().int().positive(),
});

/**
 * POST /api/entities/:entityId/budgets/rate-target
 *
 * Generates 12 monthly budget lines for a fiscal year based on a holding's
 * market value and a target annual return rate.
 *
 * Budget amounts are computed once and stored -- they do NOT auto-recalculate.
 * Calling this endpoint again with the same parameters (e.g., "Recalculate")
 * will upsert the budget lines with fresh amounts computed from the holding's
 * current market value.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
    include: { entity: true },
  });
  if (!access) return errorResponse("Entity not found", 404);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = rateTargetSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  const { holdingId, accountId, annualRate, fiscalYear } = parsed.data;

  // Fetch the holding to get its market value
  const holding = await prisma.subledgerItem.findFirst({
    where: { id: holdingId, entityId },
  });
  if (!holding) {
    return errorResponse("Holding not found", 404);
  }
  if (holding.fairMarketValue === null) {
    return errorResponse("Holding has no market value", 400);
  }

  // Compute the monthly budget amount
  const monthlyAmount = computeMonthlyBudget({
    holdingMarketValue: new Decimal(holding.fairMarketValue.toString()),
    annualReturnRate: annualRate,
  });

  // Generate 12 monthly budget lines for the fiscal year
  const fyMonths = getFiscalYearMonths(access.entity.fiscalYearEnd, fiscalYear);

  const upserts = fyMonths.map((m) =>
    prisma.budget.upsert({
      where: {
        entityId_accountId_year_month: {
          entityId,
          accountId,
          year: m.year,
          month: m.month,
        },
      },
      create: {
        entityId,
        accountId,
        year: m.year,
        month: m.month,
        amount: new Prisma.Decimal(monthlyAmount.toString()),
      },
      update: {
        amount: new Prisma.Decimal(monthlyAmount.toString()),
      },
    })
  );

  const results = await prisma.$transaction(upserts);

  return successResponse({
    created: results.length,
    monthlyAmount: monthlyAmount.toString(),
  });
}
