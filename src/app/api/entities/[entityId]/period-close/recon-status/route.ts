import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * GET /api/entities/:entityId/period-close/recon-status?year=YYYY&month=M
 *
 * Returns all active subledger items for the entity with reconciliation status
 * for the given period.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  const url = new URL(request.url);
  const year = parseInt(
    url.searchParams.get("year") ?? String(new Date().getFullYear())
  );
  const month = parseInt(
    url.searchParams.get("month") ?? String(new Date().getMonth() + 1)
  );

  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59);

  const items = await prisma.subledgerItem.findMany({
    where: { entityId, isActive: true },
    include: {
      account: { select: { id: true, number: true, name: true } },
      reconciliations: {
        orderBy: { statementDate: "desc" },
        take: 5,
      },
    },
    orderBy: [{ account: { number: "asc" } }],
  });

  return successResponse(
    items.map((item) => {
      const periodRecon =
        item.reconciliations.find(
          (r) =>
            r.statementDate >= periodStart && r.statementDate <= periodEnd
        ) ?? null;
      const latestRecon = item.reconciliations[0] ?? null;
      const latestCompleted = item.reconciliations.find(
        (r) => r.status === "COMPLETED"
      );

      let lastReconciledPeriod: { year: number; month: number } | null = null;
      if (latestCompleted) {
        const d = latestCompleted.statementDate;
        lastReconciledPeriod = {
          year: d.getFullYear(),
          month: d.getMonth() + 1,
        };
      }

      return {
        id: item.id,
        name: item.name,
        itemType: item.itemType,
        accountId: item.accountId,
        account: item.account,
        currentBalance: item.currentBalance.toString(),
        periodRecon: periodRecon
          ? {
              id: periodRecon.id,
              statementBalance: periodRecon.statementBalance.toString(),
              glBalance: periodRecon.glBalance.toString(),
              difference: periodRecon.difference.toString(),
              status: periodRecon.status,
              statementDate: periodRecon.statementDate.toISOString(),
            }
          : null,
        latestRecon: latestRecon
          ? {
              id: latestRecon.id,
              statementBalance: latestRecon.statementBalance.toString(),
              glBalance: latestRecon.glBalance.toString(),
              difference: latestRecon.difference.toString(),
              status: latestRecon.status,
              statementDate: latestRecon.statementDate.toISOString(),
            }
          : null,
        lastReconciledPeriod,
      };
    })
  );
}
