import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

// ─── Validation ─────────────────────────────────────────

const periodSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  force: z.boolean().optional(), // skip reconciliation check
});

// ─── GET: List closed periods ───────────────────────────

/**
 * GET /api/entities/:entityId/period-close
 *
 * Returns all closed periods for the entity, ordered by year desc, month desc.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  const periods = await prisma.periodClose.findMany({
    where: { entityId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return successResponse(
    periods.map((p) => ({
      ...p,
      closedAt: p.closedAt.toISOString(),
    }))
  );
}

// ─── POST: Close a period ───────────────────────────────

/**
 * POST /api/entities/:entityId/period-close
 *
 * Body: { year: number, month: number }
 * Closes the specified period. Returns 409 if already closed.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = periodSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { year, month, force } = result.data;

  // Check if already closed
  const existing = await prisma.periodClose.findUnique({
    where: { entityId_year_month: { entityId, year, month } },
  });
  if (existing) return errorResponse("Period is already closed", 409);

  // Check reconciliation status unless forced
  if (!force) {
    const subledgerItems = await prisma.subledgerItem.findMany({
      where: { entityId, isActive: true },
      include: {
        account: { select: { number: true, name: true } },
        reconciliations: {
          where: {
            status: "COMPLETED",
            statementDate: {
              gte: new Date(year, month - 1, 1),
              lte: new Date(year, month, 0),
            },
          },
          take: 1,
        },
      },
    });

    const unreconciled = subledgerItems.filter(
      (item) => item.reconciliations.length === 0
    );

    if (unreconciled.length > 0) {
      return Response.json(
        {
          success: false,
          error: `${unreconciled.length} account(s) not yet reconciled for this period`,
          unreconciledAccounts: unreconciled.map((item) => ({
            id: item.id,
            name: item.name,
            account: `${item.account.number} ${item.account.name}`,
          })),
        },
        { status: 422 }
      );
    }
  }

  const period = await prisma.periodClose.create({
    data: { entityId, year, month, closedBy: userId },
  });

  return successResponse(
    { ...period, closedAt: period.closedAt.toISOString() },
    201
  );
}

// ─── DELETE: Reopen a period ────────────────────────────

/**
 * DELETE /api/entities/:entityId/period-close
 *
 * Body: { year: number, month: number }
 * Reopens the specified period. Returns 404 if not closed.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = periodSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { year, month } = result.data;

  const existing = await prisma.periodClose.findUnique({
    where: { entityId_year_month: { entityId, year, month } },
  });
  if (!existing) return errorResponse("Period is not closed", 404);

  await prisma.periodClose.delete({
    where: { entityId_year_month: { entityId, year, month } },
  });

  return successResponse({ message: "Period reopened" });
}
