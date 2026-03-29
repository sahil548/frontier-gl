import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

// ─── Helpers ────────────────────────────────────────────

function toNum(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

// ─── GET: Dashboard ─────────────────────────────────────

/**
 * GET /api/entities/:entityId/dashboard
 *
 * Query params:
 *   consolidated — "true" | "false" (optional, default false)
 *
 * Returns combined dashboard payload: summary, recentEntries, periodStatus.
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
  const url = new URL(request.url);
  const consolidated = url.searchParams.get("consolidated") === "true";

  try {
    // Resolve entity IDs based on mode
    let entityIds: string[];

    if (consolidated) {
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
      entityIds = entities.map((e) => e.id);
      if (entityIds.length === 0) {
        return successResponse({
          summary: {
            totalAssets: 0,
            totalLiabilities: 0,
            totalEquity: 0,
            netIncome: 0,
          },
          recentEntries: [],
          periodStatus: {
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
            isClosed: false,
          },
        });
      }
    } else {
      entityIds = [entityId];
    }

    const now = new Date();

    // ── Summary: aggregate all-time balances by account type ──
    // Uses INNER JOIN so only posted JE lines are included

    const summaryRows = await prisma.$queryRaw<
      { account_type: string; net_balance: unknown }[]
    >(
      Prisma.sql`
        SELECT
          a.type::text AS account_type,
          COALESCE(SUM(
            CASE
              WHEN a.type IN ('ASSET', 'EXPENSE')
                THEN jel.debit - jel.credit
              ELSE jel.credit - jel.debit
            END
          ), 0) AS net_balance
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
        WHERE a."entityId" IN (${Prisma.join(entityIds)})
          AND a."isActive" = true
        GROUP BY a.type
      `
    );

    const balanceByType: Record<string, number> = {};
    for (const row of summaryRows) {
      balanceByType[row.account_type] = toNum(row.net_balance);
    }

    const totalAssets = balanceByType["ASSET"] ?? 0;
    const totalLiabilities = balanceByType["LIABILITY"] ?? 0;
    const totalEquity = balanceByType["EQUITY"] ?? 0;

    // ── Net Income: all-time (income - expenses) ──
    // This makes the accounting equation hold: Assets = Liabilities + Equity + Net Income

    const totalIncome = balanceByType["INCOME"] ?? 0;
    const totalExpenses = balanceByType["EXPENSE"] ?? 0;
    const netIncome = totalIncome - totalExpenses;

    // ── Recent Entries: last 5 journal entries (any status) ──

    const recentJournalEntries = await prisma.journalEntry.findMany({
      where: { entityId: { in: entityIds } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        lineItems: {
          select: { debit: true },
        },
      },
    });

    const recentEntries = recentJournalEntries.map((je) => ({
      id: je.id,
      entryNumber: je.entryNumber,
      date: je.date.toISOString(),
      description: je.description,
      status: je.status,
      totalAmount: je.lineItems.reduce(
        (sum, li) => sum + Number(li.debit),
        0
      ),
    }));

    // ── Period Status: check if current month is closed ──

    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const periodClose = await prisma.periodClose.findFirst({
      where: {
        entityId: { in: entityIds },
        year: currentYear,
        month: currentMonth,
      },
    });

    return successResponse({
      summary: {
        totalAssets,
        totalLiabilities,
        totalEquity,
        netIncome,
      },
      recentEntries,
      periodStatus: {
        year: currentYear,
        month: currentMonth,
        isClosed: !!periodClose,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
