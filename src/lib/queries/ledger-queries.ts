import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getNormalBalanceSide } from "@/lib/utils/accounting";
import type { AccountType } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LedgerFilters {
  startDate: Date;
  endDate: Date;
  memoSearch?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface LedgerRow {
  date: Date;
  jeNumber: string;
  jeId: string;
  description: string;
  lineMemo: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert Prisma Decimal / bigint / string to JS number */
function toNum(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Computes the net balance for an account from all posted transactions
 * strictly before `beforeDate`, respecting normal balance side.
 */
export async function getBeginningBalance(
  entityId: string,
  accountId: string,
  beforeDate: Date
): Promise<number> {
  // We need the account type to determine sign convention
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { type: true },
  });

  const result = await prisma.$queryRaw<
    { total_debit: unknown; total_credit: unknown }[]
  >(
    Prisma.sql`
      SELECT
        COALESCE(SUM(jel.debit), 0)  AS total_debit,
        COALESCE(SUM(jel.credit), 0) AS total_credit
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = ${accountId}
        AND je."entityId"   = ${entityId}
        AND je.status        = 'POSTED'
        AND je.date          < ${beforeDate}
    `
  );

  const row = result[0];
  const totalDebit = toNum(row?.total_debit);
  const totalCredit = toNum(row?.total_credit);

  return getNormalBalanceSide(account.type) === "DEBIT"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

/**
 * Returns posted ledger transactions for an account within a date range,
 * with a running balance computed via a PostgreSQL window function.
 *
 * Running balance respects the account's normal balance side:
 * - Debit-normal: beginning + cumulative(debit - credit)
 * - Credit-normal: beginning + cumulative(credit - debit)
 */
export async function getLedgerTransactions(
  entityId: string,
  accountId: string,
  filters: LedgerFilters
): Promise<{ beginningBalance: number; transactions: LedgerRow[] }> {
  const beginningBalance = await getBeginningBalance(
    entityId,
    accountId,
    filters.startDate
  );

  // We need account type for sign direction in the window function
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { type: true },
  });

  const isDebit = getNormalBalanceSide(account.type) === "DEBIT";

  // Build dynamic WHERE clauses
  const conditions: Prisma.Sql[] = [
    Prisma.sql`jel."accountId" = ${accountId}`,
    Prisma.sql`je."entityId"   = ${entityId}`,
    Prisma.sql`je.status        = 'POSTED'`,
    Prisma.sql`je.date         >= ${filters.startDate}`,
    Prisma.sql`je.date         <= ${filters.endDate}`,
  ];

  if (filters.memoSearch) {
    const pattern = `%${filters.memoSearch}%`;
    conditions.push(
      Prisma.sql`(je.description ILIKE ${pattern} OR jel.memo ILIKE ${pattern})`
    );
  }

  if (filters.minAmount != null && filters.maxAmount != null) {
    conditions.push(
      Prisma.sql`(
        (jel.debit  BETWEEN ${filters.minAmount}::numeric AND ${filters.maxAmount}::numeric)
        OR
        (jel.credit BETWEEN ${filters.minAmount}::numeric AND ${filters.maxAmount}::numeric)
      )`
    );
  } else if (filters.minAmount != null) {
    conditions.push(
      Prisma.sql`(jel.debit >= ${filters.minAmount}::numeric OR jel.credit >= ${filters.minAmount}::numeric)`
    );
  } else if (filters.maxAmount != null) {
    conditions.push(
      Prisma.sql`(jel.debit <= ${filters.maxAmount}::numeric OR jel.credit <= ${filters.maxAmount}::numeric)`
    );
  }

  const whereClause = Prisma.join(conditions, " AND ");

  // Sign expression for running balance
  const signExpr = isDebit
    ? Prisma.sql`(jel.debit - jel.credit)`
    : Prisma.sql`(jel.credit - jel.debit)`;

  const rows = await prisma.$queryRaw<
    {
      date: Date;
      je_number: string;
      je_id: string;
      description: string;
      line_memo: string | null;
      debit: unknown;
      credit: unknown;
      running_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        je.date,
        je."entryNumber"  AS je_number,
        je.id              AS je_id,
        je.description,
        jel.memo           AS line_memo,
        jel.debit,
        jel.credit,
        ${Prisma.raw(String(beginningBalance))}::numeric + SUM(${signExpr}) OVER (
          ORDER BY je.date, je.id, jel."sortOrder" ROWS UNBOUNDED PRECEDING
        ) AS running_balance
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE ${whereClause}
      ORDER BY je.date, je.id, jel."sortOrder"
    `
  );

  const transactions: LedgerRow[] = rows.map((r) => ({
    date: r.date,
    jeNumber: r.je_number,
    jeId: r.je_id,
    description: r.description,
    lineMemo: r.line_memo,
    debit: toNum(r.debit),
    credit: toNum(r.credit),
    runningBalance: toNum(r.running_balance),
  }));

  return { beginningBalance, transactions };
}

/**
 * Returns account summary: current balance and YTD debit/credit totals.
 */
export async function getAccountSummary(
  entityId: string,
  accountId: string
): Promise<{ currentBalance: number; ytdDebits: number; ytdCredits: number }> {
  const account = await prisma.account.findUniqueOrThrow({
    where: { id: accountId },
    select: { type: true },
  });

  // Current balance from all posted transactions
  const balResult = await prisma.$queryRaw<
    { total_debit: unknown; total_credit: unknown }[]
  >(
    Prisma.sql`
      SELECT
        COALESCE(SUM(jel.debit), 0)  AS total_debit,
        COALESCE(SUM(jel.credit), 0) AS total_credit
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = ${accountId}
        AND je."entityId"   = ${entityId}
        AND je.status        = 'POSTED'
    `
  );

  const totalDebit = toNum(balResult[0]?.total_debit);
  const totalCredit = toNum(balResult[0]?.total_credit);

  const currentBalance =
    getNormalBalanceSide(account.type) === "DEBIT"
      ? totalDebit - totalCredit
      : totalCredit - totalDebit;

  // YTD debits/credits (from Jan 1 of current year)
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const ytdResult = await prisma.$queryRaw<
    { ytd_debits: unknown; ytd_credits: unknown }[]
  >(
    Prisma.sql`
      SELECT
        COALESCE(SUM(jel.debit), 0)  AS ytd_debits,
        COALESCE(SUM(jel.credit), 0) AS ytd_credits
      FROM journal_entry_lines jel
      JOIN journal_entries je ON je.id = jel."journalEntryId"
      WHERE jel."accountId" = ${accountId}
        AND je."entityId"   = ${entityId}
        AND je.status        = 'POSTED'
        AND je.date         >= ${yearStart}
    `
  );

  return {
    currentBalance,
    ytdDebits: toNum(ytdResult[0]?.ytd_debits),
    ytdCredits: toNum(ytdResult[0]?.ytd_credits),
  };
}
