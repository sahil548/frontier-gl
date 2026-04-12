import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AccountType } from "@/generated/prisma/enums";
import { classifyCashFlowRow } from "@/lib/queries/cash-flow-classify";

// Cash Flow types
export interface CashFlowItem {
  accountName: string;
  amount: number;
}

export interface CashFlowSection {
  label: string;
  items: CashFlowItem[];
  total: number;
}

export interface CashFlowStatement {
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  beginningCash: number;
  endingCash: number;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReportRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  netBalance: number;
  isContra?: boolean;
  parentId?: string | null;
}

export interface IncomeStatementData {
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

// ---------------------------------------------------------------------------
// Dimensioned Income Statement Types
// ---------------------------------------------------------------------------

export interface TagBreakdownEntry {
  tagId: string | null;
  tagName: string | null;
  netBalance: number;
}

export interface DimensionedReportRow extends ReportRow {
  tagBreakdown: TagBreakdownEntry[];
  totalBalance: number;
}

export interface DimensionedIncomeStatementData {
  incomeRows: DimensionedReportRow[];
  expenseRows: DimensionedReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  tags: Array<{ id: string; name: string }>;
}

export interface BalanceSheetData {
  assetRows: ReportRow[];
  liabilityRows: ReportRow[];
  equityRows: ReportRow[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

// ---------------------------------------------------------------------------
// Income Statement
// ---------------------------------------------------------------------------

/**
 * Aggregates posted journal entry lines for INCOME and EXPENSE accounts
 * within a date range, grouped by account. Uses normal balance conventions:
 * income is credit-normal, expense is debit-normal.
 */
export async function getIncomeStatement(
  entityId: string,
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash' = 'accrual',
  dimensionId?: string
): Promise<IncomeStatementData | DimensionedIncomeStatementData> {
  if (dimensionId) {
    return getIncomeStatementByDimension(entityId, startDate, endDate, basis, dimensionId);
  }
  return getIncomeStatementBase(entityId, startDate, endDate, basis);
}

/**
 * Income Statement sliced by a dimension: returns column-per-tag layout.
 */
async function getIncomeStatementByDimension(
  entityId: string,
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash',
  dimensionId: string
): Promise<DimensionedIncomeStatementData> {
  const cashFilter = basis === 'cash'
    ? Prisma.sql`AND je.id IN (
        SELECT DISTINCT jel2."journalEntryId"
        FROM journal_entry_lines jel2
        JOIN accounts a2 ON a2.id = jel2."accountId"
        WHERE a2."entityId" = ${entityId}
          AND a2.type = 'ASSET'
          AND (
            LOWER(a2.name) LIKE '%cash%'
            OR LOWER(a2.name) LIKE '%bank%'
            OR LOWER(a2.name) LIKE '%checking%'
            OR LOWER(a2.name) LIKE '%savings%'
          )
      )`
    : Prisma.sql``;

  // Fetch rows grouped by account + tag
  const rows = await prisma.$queryRaw<
    {
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      tag_id: string | null;
      tag_name: string | null;
      net_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        dt.id                                      AS tag_id,
        dt.name                                    AS tag_name,
        COALESCE(SUM(
          CASE
            WHEN a.type = 'EXPENSE'
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS net_balance
      FROM accounts a
      LEFT JOIN (
        journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${startDate}
          AND je.date <= ${endDate}
          ${cashFilter}
      ) ON jel."accountId" = a.id
      LEFT JOIN journal_entry_line_dimension_tags jeldt ON jeldt."journalEntryLineId" = jel.id
      LEFT JOIN dimension_tags dt ON dt.id = jeldt."dimensionTagId" AND dt."dimensionId" = ${dimensionId}
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
        AND a.type IN ('INCOME', 'EXPENSE')
      GROUP BY a.id, a.number, a.name, a.type, dt.id, dt.name
      ORDER BY a.number, dt.name
    `
  );

  // Fetch all active tags for the dimension (for complete column headers)
  const allTags = await prisma.$queryRaw<{ id: string; name: string }[]>(
    Prisma.sql`
      SELECT id, name
      FROM dimension_tags
      WHERE "dimensionId" = ${dimensionId} AND "isActive" = true
      ORDER BY "sortOrder", name
    `
  );

  // Post-process: group by account, build tagBreakdown
  const accountMap = new Map<string, {
    accountId: string;
    accountNumber: string;
    accountName: string;
    accountType: string;
    tagMap: Map<string | null, number>;
  }>();

  for (const r of rows) {
    let entry = accountMap.get(r.account_id);
    if (!entry) {
      entry = {
        accountId: r.account_id,
        accountNumber: r.account_number,
        accountName: r.account_name,
        accountType: r.account_type,
        tagMap: new Map(),
      };
      accountMap.set(r.account_id, entry);
    }
    const bal = toNum(r.net_balance);
    if (bal !== 0) {
      const key = r.tag_id; // null = unclassified
      entry.tagMap.set(key, (entry.tagMap.get(key) ?? 0) + bal);
    }
  }

  // Build dimensioned rows
  const tagIds = allTags.map((t) => t.id);
  const buildRow = (entry: NonNullable<ReturnType<typeof accountMap.get>>): DimensionedReportRow => {
    const tagBreakdown: TagBreakdownEntry[] = [];

    // One entry per known tag
    for (const tag of allTags) {
      tagBreakdown.push({
        tagId: tag.id,
        tagName: tag.name,
        netBalance: entry.tagMap.get(tag.id) ?? 0,
      });
    }

    // Unclassified bucket: null key + any tag IDs not in the active dimension
    let unclassifiedBalance = entry.tagMap.get(null) ?? 0;
    for (const [key, val] of entry.tagMap) {
      if (key !== null && !tagIds.includes(key)) {
        unclassifiedBalance += val;
      }
    }
    tagBreakdown.push({
      tagId: null,
      tagName: null,
      netBalance: unclassifiedBalance,
    });

    const totalBalance = tagBreakdown.reduce((sum, t) => sum + t.netBalance, 0);

    return {
      accountId: entry.accountId,
      accountNumber: entry.accountNumber,
      accountName: entry.accountName,
      accountType: entry.accountType as AccountType,
      netBalance: totalBalance,
      tagBreakdown,
      totalBalance,
    };
  };

  const allRows = Array.from(accountMap.values()).map(buildRow);
  const incomeRows = allRows.filter((r) => r.accountType === 'INCOME');
  const expenseRows = allRows.filter((r) => r.accountType === 'EXPENSE');

  const totalIncome = incomeRows.reduce((sum, r) => sum + r.totalBalance, 0);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + r.totalBalance, 0);
  const netIncome = totalIncome - totalExpenses;

  return {
    incomeRows,
    expenseRows,
    totalIncome,
    totalExpenses,
    netIncome,
    tags: allTags,
  };
}

/**
 * Base (non-dimensioned) income statement query.
 */
async function getIncomeStatementBase(
  entityId: string,
  startDate: Date,
  endDate: Date,
  basis: 'accrual' | 'cash' = 'accrual'
): Promise<IncomeStatementData> {
  const cashFilter = basis === 'cash'
    ? Prisma.sql`AND je.id IN (
        SELECT DISTINCT jel2."journalEntryId"
        FROM journal_entry_lines jel2
        JOIN accounts a2 ON a2.id = jel2."accountId"
        WHERE a2."entityId" = ${entityId}
          AND a2.type = 'ASSET'
          AND (
            LOWER(a2.name) LIKE '%cash%'
            OR LOWER(a2.name) LIKE '%bank%'
            OR LOWER(a2.name) LIKE '%checking%'
            OR LOWER(a2.name) LIKE '%savings%'
          )
      )`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<
    {
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      net_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        COALESCE(SUM(
          CASE
            WHEN a.type = 'EXPENSE'
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS net_balance
      FROM accounts a
      LEFT JOIN (
        journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${startDate}
          AND je.date <= ${endDate}
          ${cashFilter}
      ) ON jel."accountId" = a.id
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
        AND a.type IN ('INCOME', 'EXPENSE')
      GROUP BY a.id, a.number, a.name, a.type
      ORDER BY a.number
    `
  );

  const mapped = rows.map((r) => ({
    accountId: r.account_id,
    accountNumber: r.account_number,
    accountName: r.account_name,
    accountType: r.account_type as AccountType,
    netBalance: toNum(r.net_balance),
  }));

  const incomeRows = mapped.filter((r) => r.accountType === "INCOME");
  const expenseRows = mapped.filter((r) => r.accountType === "EXPENSE");

  const totalIncome = incomeRows.reduce((sum, r) => sum + r.netBalance, 0);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + r.netBalance, 0);
  const netIncome = totalIncome - totalExpenses;

  return { incomeRows, expenseRows, totalIncome, totalExpenses, netIncome };
}

// ---------------------------------------------------------------------------
// Balance Sheet
// ---------------------------------------------------------------------------

/**
 * Aggregates all posted journal entry lines through asOfDate for ASSET,
 * LIABILITY, and EQUITY accounts, grouped by account.
 * Uses normal balance conventions: assets are debit-normal,
 * liabilities and equity are credit-normal.
 */
export async function getBalanceSheet(
  entityId: string,
  asOfDate: Date,
  basis: 'accrual' | 'cash' = 'accrual'
): Promise<BalanceSheetData> {
  const cashFilter = basis === 'cash'
    ? Prisma.sql`AND je.id IN (
        SELECT DISTINCT jel2."journalEntryId"
        FROM journal_entry_lines jel2
        JOIN accounts a2 ON a2.id = jel2."accountId"
        WHERE a2."entityId" = ${entityId}
          AND a2.type = 'ASSET'
          AND (
            LOWER(a2.name) LIKE '%cash%'
            OR LOWER(a2.name) LIKE '%bank%'
            OR LOWER(a2.name) LIKE '%checking%'
            OR LOWER(a2.name) LIKE '%savings%'
          )
      )`
    : Prisma.sql``;

  const rows = await prisma.$queryRaw<
    {
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      is_contra: boolean;
      parent_id: string | null;
      net_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        a."isContra"                               AS is_contra,
        a."parentId"                               AS parent_id,
        COALESCE(SUM(
          CASE
            WHEN a.type = 'ASSET'
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS net_balance
      FROM accounts a
      LEFT JOIN (
        journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date <= ${asOfDate}
          ${cashFilter}
      ) ON jel."accountId" = a.id
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
        AND a.type IN ('ASSET', 'LIABILITY', 'EQUITY')
      GROUP BY a.id, a.number, a.name, a.type, a."isContra", a."parentId"
      ORDER BY a.number
    `
  );

  const mapped = rows.map((r) => ({
    accountId: r.account_id,
    accountNumber: r.account_number,
    accountName: r.account_name,
    accountType: r.account_type as AccountType,
    netBalance: toNum(r.net_balance),
    isContra: r.is_contra,
    parentId: r.parent_id,
  }));

  const assetRows = mapped.filter((r) => r.accountType === "ASSET");
  const liabilityRows = mapped.filter((r) => r.accountType === "LIABILITY");
  const equityRows = mapped.filter((r) => r.accountType === "EQUITY");

  const totalAssets = assetRows.reduce((sum, r) => sum + r.netBalance, 0);
  const totalLiabilities = liabilityRows.reduce((sum, r) => sum + r.netBalance, 0);
  const totalEquity = equityRows.reduce((sum, r) => sum + r.netBalance, 0);

  return { assetRows, liabilityRows, equityRows, totalAssets, totalLiabilities, totalEquity };
}

// ---------------------------------------------------------------------------
// Budget vs Actual
// ---------------------------------------------------------------------------

export interface BudgetVsActualRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: string; // "INCOME" | "EXPENSE"
  actual: number;
  budget: number;
  varianceDollar: number;
  variancePercent: number | null; // null when budget is zero
}

export interface BudgetVsActualTotals {
  actual: number;
  budget: number;
  varianceDollar: number;
  variancePercent: number | null;
}

export interface BudgetVsActualData {
  incomeRows: BudgetVsActualRow[];
  expenseRows: BudgetVsActualRow[];
  totalIncome: BudgetVsActualTotals;
  totalExpenses: BudgetVsActualTotals;
  netIncome: BudgetVsActualTotals;
}

function computeVariancePercent(varianceDollar: number, budget: number): number | null {
  if (budget === 0) return null;
  return (varianceDollar / Math.abs(budget)) * 100;
}

/**
 * Budget vs Actual report: joins actuals (from posted journal entries) with
 * budget amounts for INCOME and EXPENSE accounts in the given date range.
 *
 * Variance conventions:
 * - Income: varianceDollar = actual - budget (positive = favorable)
 * - Expense: varianceDollar = budget - actual (positive = favorable)
 */
export async function getBudgetVsActual(
  entityId: string,
  startDate: Date,
  endDate: Date
): Promise<BudgetVsActualData> {
  // Compute which year/month combos fall in the date range.
  // Include a month's budget if any day of that month falls within the range.
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  const endYear = endDate.getFullYear();
  const endMonth = endDate.getMonth() + 1;

  // Build the YYYYMM range for budget filtering
  const startYM = startYear * 100 + startMonth;
  const endYM = endYear * 100 + endMonth;

  const rows = await prisma.$queryRaw<
    {
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      actual_amount: unknown;
      budget_amount: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        COALESCE(SUM(
          CASE
            WHEN a.type = 'EXPENSE'
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS actual_amount,
        COALESCE(b.budget_total, 0)                AS budget_amount
      FROM accounts a
      LEFT JOIN (
        journal_entry_lines jel
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date >= ${startDate}
          AND je.date <= ${endDate}
      ) ON jel."accountId" = a.id
      LEFT JOIN (
        SELECT "accountId", SUM(amount) AS budget_total
        FROM budgets
        WHERE "entityId" = ${entityId}
          AND (year * 100 + month) >= ${startYM}
          AND (year * 100 + month) <= ${endYM}
        GROUP BY "accountId"
      ) b ON b."accountId" = a.id
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
        AND a.type IN ('INCOME', 'EXPENSE')
      GROUP BY a.id, a.number, a.name, a.type, b.budget_total
      ORDER BY a.number
    `
  );

  const incomeRows: BudgetVsActualRow[] = [];
  const expenseRows: BudgetVsActualRow[] = [];

  for (const r of rows) {
    const actual = toNum(r.actual_amount);
    const budget = toNum(r.budget_amount);
    const isIncome = r.account_type === "INCOME";

    // Income: favorable = actual > budget, Expense: favorable = actual < budget
    const varianceDollar = isIncome ? actual - budget : budget - actual;
    const variancePercent = computeVariancePercent(varianceDollar, budget);

    const row: BudgetVsActualRow = {
      accountId: r.account_id,
      accountNumber: r.account_number,
      accountName: r.account_name,
      accountType: r.account_type,
      actual,
      budget,
      varianceDollar,
      variancePercent,
    };

    if (isIncome) {
      incomeRows.push(row);
    } else {
      expenseRows.push(row);
    }
  }

  // Section totals
  const totalIncomeActual = incomeRows.reduce((s, r) => s + r.actual, 0);
  const totalIncomeBudget = incomeRows.reduce((s, r) => s + r.budget, 0);
  const totalIncomeVariance = totalIncomeActual - totalIncomeBudget;

  const totalExpenseActual = expenseRows.reduce((s, r) => s + r.actual, 0);
  const totalExpenseBudget = expenseRows.reduce((s, r) => s + r.budget, 0);
  const totalExpenseVariance = totalExpenseBudget - totalExpenseActual;

  // Net income
  const netActual = totalIncomeActual - totalExpenseActual;
  const netBudget = totalIncomeBudget - totalExpenseBudget;
  const netVariance = netActual - netBudget;

  return {
    incomeRows,
    expenseRows,
    totalIncome: {
      actual: totalIncomeActual,
      budget: totalIncomeBudget,
      varianceDollar: totalIncomeVariance,
      variancePercent: computeVariancePercent(totalIncomeVariance, totalIncomeBudget),
    },
    totalExpenses: {
      actual: totalExpenseActual,
      budget: totalExpenseBudget,
      varianceDollar: totalExpenseVariance,
      variancePercent: computeVariancePercent(totalExpenseVariance, totalExpenseBudget),
    },
    netIncome: {
      actual: netActual,
      budget: netBudget,
      varianceDollar: netVariance,
      variancePercent: computeVariancePercent(netVariance, netBudget),
    },
  };
}

// ---------------------------------------------------------------------------
// Cash Flow Statement (Indirect Method)
// ---------------------------------------------------------------------------

/**
 * Builds an indirect-method Statement of Cash Flows for the given period.
 *
 * Operating: net income + depreciation + changes in working capital
 * Investing: changes in investment / securities / real estate accounts
 * Financing: changes in loans / mortgages / equity contributions / distributions
 */
export async function getCashFlowStatement(
  entityId: string,
  startDate: Date,
  endDate: Date
): Promise<CashFlowStatement> {
  // ── 1. Get all account movements for the period ──────────────────
  const rows = await prisma.$queryRaw<
    {
      account_name: string;
      account_type: string;
      cash_flow_category: string | null;
      net_movement: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        a."cashFlowCategory"::text                 AS cash_flow_category,
        COALESCE(SUM(jel.debit - jel.credit), 0)   AS net_movement
      FROM accounts a
      JOIN journal_entry_lines jel ON jel."accountId" = a.id
      JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
      GROUP BY a.name, a.type, a."cashFlowCategory"
      ORDER BY a.name
    `
  );

  // ── 2. Compute Net Income ────────────────────────────────────────
  let netIncome = 0;
  for (const r of rows) {
    const mv = toNum(r.net_movement);
    if (r.account_type === "INCOME") {
      // Income is credit-normal: credits minus debits = -(debit - credit)
      netIncome += -mv;
    } else if (r.account_type === "EXPENSE") {
      // Expense is debit-normal: debits minus credits
      netIncome -= mv;
    }
  }

  // ── 3. Classify accounts into sections ───────────────────────────
  const operatingItems: CashFlowItem[] = [];
  const investingItems: CashFlowItem[] = [];
  const financingItems: CashFlowItem[] = [];

  // Add net income as first operating item
  operatingItems.push({ accountName: "Net Income", amount: netIncome });

  for (const r of rows) {
    const mv = toNum(r.net_movement);
    const result = classifyCashFlowRow({
      account_name: r.account_name,
      account_type: r.account_type,
      cash_flow_category: r.cash_flow_category,
      net_movement: mv,
    });
    if (!result) continue;

    switch (result.section) {
      case "operating":
        operatingItems.push(result.item);
        break;
      case "investing":
        investingItems.push(result.item);
        break;
      case "financing":
        financingItems.push(result.item);
        break;
    }
  }

  // ── 4. Compute section totals ────────────────────────────────────
  const operatingTotal = operatingItems.reduce((s, i) => s + i.amount, 0);
  const investingTotal = investingItems.reduce((s, i) => s + i.amount, 0);
  const financingTotal = financingItems.reduce((s, i) => s + i.amount, 0);

  // ── 5. Cash balances ─────────────────────────────────────────────
  const cashBalanceQuery = async (asOf: Date) => {
    const result = await prisma.$queryRaw<{ balance: unknown }[]>(
      Prisma.sql`
        SELECT COALESCE(SUM(jel.debit - jel.credit), 0) AS balance
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date <= ${asOf}
        WHERE a."entityId" = ${entityId}
          AND a."isActive" = true
          AND a.type = 'ASSET'
          AND a."cashFlowCategory" = 'EXCLUDED'
      `
    );
    return toNum(result[0]?.balance);
  };

  // Beginning cash = balance as of day before startDate
  const dayBeforeStart = new Date(startDate);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  const beginningCash = await cashBalanceQuery(dayBeforeStart);
  const endingCash = await cashBalanceQuery(endDate);
  const netChange = operatingTotal + investingTotal + financingTotal;

  return {
    operating: {
      label: "Cash Flows from Operating Activities",
      items: operatingItems,
      total: operatingTotal,
    },
    investing: {
      label: "Cash Flows from Investing Activities",
      items: investingItems,
      total: investingTotal,
    },
    financing: {
      label: "Cash Flows from Financing Activities",
      items: financingItems,
      total: financingTotal,
    },
    netChange,
    beginningCash,
    endingCash,
  };
}
