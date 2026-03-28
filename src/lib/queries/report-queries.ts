import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AccountType } from "@/generated/prisma/enums";

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
  endDate: Date
): Promise<IncomeStatementData> {
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
      LEFT JOIN journal_entry_lines jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date >= ${startDate}
        AND je.date <= ${endDate}
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
  asOfDate: Date
): Promise<BalanceSheetData> {
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
      LEFT JOIN journal_entry_lines jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date <= ${asOfDate}
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
