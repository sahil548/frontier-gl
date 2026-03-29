import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getAccessibleEntityIds } from "@/lib/db/entity-access";

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
  const incomeStartParam = url.searchParams.get("incomeStart");
  const incomeEndParam = url.searchParams.get("incomeEnd");

  try {
    // Resolve entity IDs based on mode
    let entityIds: string[];

    if (consolidated) {
      entityIds = await getAccessibleEntityIds(userId);
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

    // ── Net Income: filtered by period (defaults to current month) ──

    const monthStart = incomeStartParam
      ? new Date(incomeStartParam)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = incomeEndParam
      ? new Date(incomeEndParam)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const incomeExpenseRows = await prisma.$queryRaw<
      { account_type: string; net_balance: unknown }[]
    >(
      Prisma.sql`
        SELECT
          a.type::text AS account_type,
          COALESCE(SUM(
            CASE
              WHEN a.type = 'INCOME'
                THEN jel.credit - jel.debit
              ELSE jel.debit - jel.credit
            END
          ), 0) AS net_balance
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${monthStart}
          AND je.date <= ${monthEnd}
        WHERE a."entityId" IN (${Prisma.join(entityIds)})
          AND a."isActive" = true
          AND a.type IN ('INCOME', 'EXPENSE')
        GROUP BY a.type
      `
    );

    let netIncome = 0;
    for (const row of incomeExpenseRows) {
      if (row.account_type === "INCOME") {
        netIncome += toNum(row.net_balance);
      } else if (row.account_type === "EXPENSE") {
        netIncome -= toNum(row.net_balance);
      }
    }

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

    // ── Asset Breakdown: top-level ASSET accounts by balance ──

    const assetBreakdownRows = await prisma.$queryRaw<
      { name: string; value: unknown }[]
    >(
      Prisma.sql`
        SELECT
          a.name,
          ABS(COALESCE(SUM(jel.debit - jel.credit), 0)) AS value
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${monthStart}
          AND je.date <= ${monthEnd}
        WHERE a."entityId" IN (${Prisma.join(entityIds)})
          AND a."isActive" = true
          AND a.type = 'ASSET'
          AND a."parentId" IS NULL
        GROUP BY a.name
        HAVING ABS(COALESCE(SUM(jel.debit - jel.credit), 0)) > 0
        ORDER BY value DESC
        LIMIT 8
      `
    );

    const assetBreakdown = assetBreakdownRows.map((r) => ({
      name: r.name,
      value: toNum(r.value),
    }));

    // ── Income vs Expense totals ──

    const incomeVsExpenseRows = await prisma.$queryRaw<
      { account_type: string; amount: unknown }[]
    >(
      Prisma.sql`
        SELECT
          a.type::text AS account_type,
          COALESCE(SUM(
            CASE
              WHEN a.type = 'INCOME' THEN jel.credit - jel.debit
              ELSE jel.debit - jel.credit
            END
          ), 0) AS amount
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${monthStart}
          AND je.date <= ${monthEnd}
        WHERE a."entityId" IN (${Prisma.join(entityIds)})
          AND a."isActive" = true
          AND a.type IN ('INCOME', 'EXPENSE')
        GROUP BY a.type
      `
    );

    const incomeVsExpense: { category: string; amount: number }[] = [];
    for (const row of incomeVsExpenseRows) {
      incomeVsExpense.push({
        category: row.account_type === "INCOME" ? "Revenue" : "Expense",
        amount: toNum(row.amount),
      });
    }

    // ── Equity Trend: monthly cumulative equity over last 12 months ──

    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const equityTrendRows = await prisma.$queryRaw<
      { month: string; equity: unknown }[]
    >(
      Prisma.sql`
        WITH monthly AS (
          SELECT
            TO_CHAR(DATE_TRUNC('month', je.date), 'YYYY-MM') AS month,
            SUM(jel.credit - jel.debit) AS monthly_net
          FROM accounts a
          JOIN journal_entry_lines jel ON jel."accountId" = a.id
          JOIN journal_entries je ON je.id = jel."journalEntryId"
            AND je.status = 'POSTED'
          WHERE a."entityId" IN (${Prisma.join(entityIds)})
            AND a."isActive" = true
            AND a.type = 'EQUITY'
          GROUP BY DATE_TRUNC('month', je.date)
        )
        SELECT
          m.month,
          SUM(m2.monthly_net) AS equity
        FROM monthly m
        JOIN monthly m2 ON m2.month <= m.month
        WHERE m.month >= ${twelveMonthsAgo.toISOString().slice(0, 7)}
        GROUP BY m.month
        ORDER BY m.month
      `
    );

    const equityTrend = equityTrendRows.map((r) => ({
      month: r.month,
      equity: toNum(r.equity),
    }));

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
      assetBreakdown,
      incomeVsExpense,
      equityTrend,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return errorResponse("Failed to fetch dashboard data", 500);
  }
}
