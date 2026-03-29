import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { AccountType } from "@/generated/prisma/enums";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TrialBalanceRow {
  accountId: string;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
}

export interface ConsolidatedTrialBalanceRow extends TrialBalanceRow {
  entityId: string;
  entityName: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNum(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Aggregates all posted transactions through `asOfDate` for a single entity,
 * grouped by account. Only includes active accounts.
 * Returns rows ordered by account number.
 */
// ---------------------------------------------------------------------------
// Dimension filter type
// ---------------------------------------------------------------------------

export interface DimensionFilter {
  dimensionId: string;
  tagId: string;
}

export async function getTrialBalance(
  entityId: string,
  asOfDate: Date,
  dimensionFilters?: DimensionFilter[]
): Promise<TrialBalanceRow[]> {
  // Build dynamic dimension filter JOINs and WHERE clauses
  const hasFilters = dimensionFilters && dimensionFilters.length > 0;

  if (hasFilters) {
    // Build INNER JOIN clauses for AND logic
    const joinClauses = dimensionFilters!.map((f, i) =>
      Prisma.sql`INNER JOIN journal_entry_line_dimension_tags jeldt${Prisma.raw(String(i))}
        ON jeldt${Prisma.raw(String(i))}."journalEntryLineId" = jel.id
        AND jeldt${Prisma.raw(String(i))}."dimensionTagId" = ${f.tagId}`
    );

    const joinsSql = Prisma.sql`${Prisma.join(joinClauses, "\n")}`;

    const rows = await prisma.$queryRaw<
      {
        account_id: string;
        account_number: string;
        account_name: string;
        account_type: string;
        total_debits: unknown;
        total_credits: unknown;
        net_balance: unknown;
      }[]
    >(
      Prisma.sql`
        SELECT
          a.id                                       AS account_id,
          a.number                                   AS account_number,
          a.name                                     AS account_name,
          a.type::text                               AS account_type,
          COALESCE(SUM(jel.debit), 0)                AS total_debits,
          COALESCE(SUM(jel.credit), 0)               AS total_credits,
          COALESCE(SUM(
            CASE
              WHEN a.type IN ('ASSET', 'EXPENSE')
                THEN jel.debit - jel.credit
              ELSE jel.credit - jel.debit
            END
          ), 0)                                      AS net_balance
        FROM accounts a
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date  <= ${asOfDate}
        ${joinsSql}
        WHERE a."entityId"  = ${entityId}
          AND a."isActive"   = true
        GROUP BY a.id, a.number, a.name, a.type
        HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
        ORDER BY a.number
      `
    );

    return rows.map((r) => ({
      accountId: r.account_id,
      accountNumber: r.account_number,
      accountName: r.account_name,
      accountType: r.account_type as AccountType,
      totalDebits: toNum(r.total_debits),
      totalCredits: toNum(r.total_credits),
      netBalance: toNum(r.net_balance),
    }));
  }

  // No filters: original query
  const rows = await prisma.$queryRaw<
    {
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      total_debits: unknown;
      total_credits: unknown;
      net_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        COALESCE(SUM(jel.debit), 0)                AS total_debits,
        COALESCE(SUM(jel.credit), 0)               AS total_credits,
        COALESCE(SUM(
          CASE
            WHEN a.type IN ('ASSET', 'EXPENSE')
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS net_balance
      FROM accounts a
      LEFT JOIN journal_entry_lines jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date  <= ${asOfDate}
      WHERE a."entityId"  = ${entityId}
        AND a."isActive"   = true
      GROUP BY a.id, a.number, a.name, a.type
      ORDER BY a.number
    `
  );

  return rows.map((r) => ({
    accountId: r.account_id,
    accountNumber: r.account_number,
    accountName: r.account_name,
    accountType: r.account_type as AccountType,
    totalDebits: toNum(r.total_debits),
    totalCredits: toNum(r.total_credits),
    netBalance: toNum(r.net_balance),
  }));
}

/**
 * Aggregates posted transactions through `asOfDate` across multiple entities,
 * grouped by account AND entity. Includes entity name for tree-style grouping.
 * Returns rows ordered by account number, then entity name.
 */
export async function getConsolidatedTrialBalance(
  entityIds: string[],
  asOfDate: Date,
  dimensionFilters?: DimensionFilter[]
): Promise<ConsolidatedTrialBalanceRow[]> {
  if (entityIds.length === 0) return [];

  const hasFilters = dimensionFilters && dimensionFilters.length > 0;

  if (hasFilters) {
    const joinClauses = dimensionFilters!.map((f, i) =>
      Prisma.sql`INNER JOIN journal_entry_line_dimension_tags jeldt${Prisma.raw(String(i))}
        ON jeldt${Prisma.raw(String(i))}."journalEntryLineId" = jel.id
        AND jeldt${Prisma.raw(String(i))}."dimensionTagId" = ${f.tagId}`
    );
    const joinsSql = Prisma.sql`${Prisma.join(joinClauses, "\n")}`;

    const rows = await prisma.$queryRaw<
      {
        entity_id: string;
        entity_name: string;
        account_id: string;
        account_number: string;
        account_name: string;
        account_type: string;
        total_debits: unknown;
        total_credits: unknown;
        net_balance: unknown;
      }[]
    >(
      Prisma.sql`
        SELECT
          e.id                                       AS entity_id,
          e.name                                     AS entity_name,
          a.id                                       AS account_id,
          a.number                                   AS account_number,
          a.name                                     AS account_name,
          a.type::text                               AS account_type,
          COALESCE(SUM(jel.debit), 0)                AS total_debits,
          COALESCE(SUM(jel.credit), 0)               AS total_credits,
          COALESCE(SUM(
            CASE
              WHEN a.type IN ('ASSET', 'EXPENSE')
                THEN jel.debit - jel.credit
              ELSE jel.credit - jel.debit
            END
          ), 0)                                      AS net_balance
        FROM accounts a
        JOIN "Entity" e ON e.id = a."entityId"
        JOIN journal_entry_lines jel ON jel."accountId" = a.id
        JOIN journal_entries je ON je.id = jel."journalEntryId"
          AND je.status = 'POSTED'
          AND je.date  <= ${asOfDate}
        ${joinsSql}
        WHERE a."entityId" IN (${Prisma.join(entityIds)})
          AND a."isActive"   = true
        GROUP BY e.id, e.name, a.id, a.number, a.name, a.type
        HAVING COALESCE(SUM(jel.debit), 0) != 0 OR COALESCE(SUM(jel.credit), 0) != 0
        ORDER BY a.number, e.name
      `
    );

    return rows.map((r) => ({
      entityId: r.entity_id,
      entityName: r.entity_name,
      accountId: r.account_id,
      accountNumber: r.account_number,
      accountName: r.account_name,
      accountType: r.account_type as AccountType,
      totalDebits: toNum(r.total_debits),
      totalCredits: toNum(r.total_credits),
      netBalance: toNum(r.net_balance),
    }));
  }

  // No filters: original query
  const rows = await prisma.$queryRaw<
    {
      entity_id: string;
      entity_name: string;
      account_id: string;
      account_number: string;
      account_name: string;
      account_type: string;
      total_debits: unknown;
      total_credits: unknown;
      net_balance: unknown;
    }[]
  >(
    Prisma.sql`
      SELECT
        e.id                                       AS entity_id,
        e.name                                     AS entity_name,
        a.id                                       AS account_id,
        a.number                                   AS account_number,
        a.name                                     AS account_name,
        a.type::text                               AS account_type,
        COALESCE(SUM(jel.debit), 0)                AS total_debits,
        COALESCE(SUM(jel.credit), 0)               AS total_credits,
        COALESCE(SUM(
          CASE
            WHEN a.type IN ('ASSET', 'EXPENSE')
              THEN jel.debit - jel.credit
            ELSE jel.credit - jel.debit
          END
        ), 0)                                      AS net_balance
      FROM accounts a
      JOIN "Entity" e ON e.id = a."entityId"
      LEFT JOIN journal_entry_lines jel ON jel."accountId" = a.id
      LEFT JOIN journal_entries je ON je.id = jel."journalEntryId"
        AND je.status = 'POSTED'
        AND je.date  <= ${asOfDate}
      WHERE a."entityId" IN (${Prisma.join(entityIds)})
        AND a."isActive"   = true
      GROUP BY e.id, e.name, a.id, a.number, a.name, a.type
      ORDER BY a.number, e.name
    `
  );

  return rows.map((r) => ({
    entityId: r.entity_id,
    entityName: r.entity_name,
    accountId: r.account_id,
    accountNumber: r.account_number,
    accountName: r.account_name,
    accountType: r.account_type as AccountType,
    totalDebits: toNum(r.total_debits),
    totalCredits: toNum(r.total_credits),
    netBalance: toNum(r.net_balance),
  }));
}
