import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { serializeDecimal } from "@/lib/utils/serialization";
import { getInternalUser } from "@/lib/db/entity-access";
import { getFiscalYearMonths } from "@/lib/utils/fiscal-year";
import { budgetUpsertSchema } from "@/validators/budget";
import { Prisma } from "@/generated/prisma/client";

/**
 * GET /api/entities/:entityId/budgets?fiscalYear=2025
 *
 * Returns budget rows for the requested fiscal year, scoped to entity.
 * Only INCOME and EXPENSE accounts are included.
 */
export async function GET(
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
  if (!access) return errorResponse("Entity not found", 403);

  const url = new URL(request.url);
  const fiscalYearParam = url.searchParams.get("fiscalYear");
  if (!fiscalYearParam || isNaN(Number(fiscalYearParam))) {
    return errorResponse("fiscalYear query parameter is required", 400);
  }
  const fiscalYear = parseInt(fiscalYearParam, 10);

  const fyMonths = getFiscalYearMonths(access.entity.fiscalYearEnd, fiscalYear);

  // Build OR conditions for each (year, month) pair in the fiscal year
  const monthConditions = fyMonths.map((m) => ({
    year: m.year,
    month: m.month,
  }));

  const budgets = await prisma.budget.findMany({
    where: {
      entityId,
      OR: monthConditions,
    },
    include: {
      account: {
        select: { id: true, number: true, name: true, type: true },
      },
    },
    orderBy: [{ account: { number: "asc" } }, { year: "asc" }, { month: "asc" }],
  });

  // Filter to only INCOME and EXPENSE accounts
  const filtered = budgets.filter(
    (b) => b.account.type === "INCOME" || b.account.type === "EXPENSE"
  );

  const serialized = filtered.map((b) => ({
    id: b.id,
    entityId: b.entityId,
    accountId: b.accountId,
    year: b.year,
    month: b.month,
    amount: serializeDecimal(b.amount),
    account: b.account,
  }));

  return successResponse(serialized);
}

/**
 * PUT /api/entities/:entityId/budgets
 *
 * Bulk upsert budget amounts. Requires Owner or Editor role.
 * Skips rows where amount is "0" or empty string.
 */
export async function PUT(
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
  });
  if (!access) return errorResponse("Entity not found", 403);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = budgetUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  const { budgets } = parsed.data;

  // Filter out zero/empty amounts
  const nonZero = budgets.filter((b) => {
    const amt = b.amount.trim();
    return amt !== "" && amt !== "0" && parseFloat(amt) !== 0;
  });

  if (nonZero.length === 0) {
    return successResponse({ upserted: 0 });
  }

  const upserts = nonZero.map((b) =>
    prisma.budget.upsert({
      where: {
        entityId_accountId_year_month: {
          entityId,
          accountId: b.accountId,
          year: b.year,
          month: b.month,
        },
      },
      create: {
        entityId,
        accountId: b.accountId,
        year: b.year,
        month: b.month,
        amount: new Prisma.Decimal(b.amount),
      },
      update: {
        amount: new Prisma.Decimal(b.amount),
      },
    })
  );

  const results = await prisma.$transaction(upserts);

  return successResponse({ upserted: results.length });
}
