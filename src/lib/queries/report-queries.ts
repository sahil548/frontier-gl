import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AccountType } from "@/generated/prisma/enums";

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
}

export interface IncomeStatementData {
  incomeRows: ReportRow[];
  expenseRows: ReportRow[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
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

  const assetRows = mapped.filter((r) => r.accountType === "ASSET");
  const liabilityRows = mapped.filter((r) => r.accountType === "LIABILITY");
  const equityRows = mapped.filter((r) => r.accountType === "EQUITY");

  const totalAssets = assetRows.reduce((sum, r) => sum + r.netBalance, 0);
  const totalLiabilities = liabilityRows.reduce((sum, r) => sum + r.netBalance, 0);
  const totalEquity = equityRows.reduce((sum, r) => sum + r.netBalance, 0);

  return { assetRows, liabilityRows, equityRows, totalAssets, totalLiabilities, totalEquity };
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
      net_movement: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        COALESCE(SUM(jel.debit - jel.credit), 0)   AS net_movement
      FROM accounts a
      JOIN journal_entry_lines jel ON jel."accountId" = a.id
      JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
      WHERE a."entityId" = ${entityId}
        AND a."isActive" = true
      GROUP BY a.name, a.type
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
    const nameLower = r.account_name.toLowerCase();
    const mv = toNum(r.net_movement);
    if (mv === 0) continue;

    // Skip cash accounts (they are the result, not a source)
    if (r.account_type === "ASSET" && nameLower.includes("cash")) continue;

    // Skip income/expense — already captured in net income
    if (r.account_type === "INCOME" || r.account_type === "EXPENSE") {
      // Exception: add back depreciation expense
      if (r.account_type === "EXPENSE" && nameLower.includes("depreciation")) {
        operatingItems.push({
          accountName: `Add back: ${r.account_name}`,
          amount: mv, // debit-normal, so positive = expense incurred
        });
      }
      continue;
    }

    // ── Investing: investment-type asset accounts ──
    if (
      r.account_type === "ASSET" &&
      (nameLower.includes("investment") ||
        nameLower.includes("securities") ||
        nameLower.includes("real estate") ||
        nameLower.includes("private equity"))
    ) {
      // Asset increase (debit) = cash outflow (negative)
      investingItems.push({ accountName: r.account_name, amount: -mv });
      continue;
    }

    // ── Financing: loan / mortgage liabilities ──
    if (
      r.account_type === "LIABILITY" &&
      (nameLower.includes("loan") || nameLower.includes("mortgage"))
    ) {
      // Liability increase (credit, mv < 0) = cash inflow (positive)
      financingItems.push({ accountName: r.account_name, amount: -mv });
      continue;
    }

    // ── Financing: equity contributions ──
    if (
      r.account_type === "EQUITY" &&
      (nameLower.includes("equity") || nameLower.includes("capital")) &&
      !nameLower.includes("retained")
    ) {
      financingItems.push({ accountName: r.account_name, amount: -mv });
      continue;
    }

    // ── Financing: distributions ──
    if (r.account_type === "EQUITY" && nameLower.includes("distribution")) {
      // Distribution is a debit to equity = cash outflow
      financingItems.push({ accountName: r.account_name, amount: -mv });
      continue;
    }

    // ── Operating: working capital changes ──
    if (r.account_type === "ASSET") {
      if (
        nameLower.includes("receivable") ||
        nameLower.includes("prepaid")
      ) {
        // Asset increase = cash used (negative)
        operatingItems.push({ accountName: `Change in ${r.account_name}`, amount: -mv });
        continue;
      }
    }

    if (r.account_type === "LIABILITY") {
      if (
        nameLower.includes("payable") ||
        nameLower.includes("accrued")
      ) {
        // Liability increase = cash source (positive)
        operatingItems.push({ accountName: `Change in ${r.account_name}`, amount: -mv });
        continue;
      }
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
          AND LOWER(a.name) LIKE '%cash%'
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
