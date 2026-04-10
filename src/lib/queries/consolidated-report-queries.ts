import { prisma } from "@/lib/db/prisma";
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
} from "@/lib/queries/report-queries";
import type {
  IncomeStatementData,
  BalanceSheetData,
  ReportRow,
  CashFlowItem,
} from "@/lib/queries/report-queries";
import type { AccountType } from "@/generated/prisma/enums";
import type {
  ConsolidatedIncomeStatement,
  ConsolidatedBalanceSheet,
  ConsolidatedCashFlow,
  EliminationRow,
  Mismatch,
} from "@/types/consolidated";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EPSILON = 0.005;

/**
 * Search through all row arrays in IncomeStatementData or BalanceSheetData
 * to find the matching account's netBalance. Returns 0 if not found.
 */
function findAccountBalance(
  data: IncomeStatementData | BalanceSheetData,
  accountId: string
): number {
  // Collect all row arrays from either report type
  const allRows: ReportRow[] = [];
  if ("incomeRows" in data) {
    allRows.push(...data.incomeRows, ...data.expenseRows);
  }
  if ("assetRows" in data) {
    allRows.push(...data.assetRows, ...data.liabilityRows, ...data.equityRows);
  }
  const row = allRows.find((r) => r.accountId === accountId);
  return row?.netBalance ?? 0;
}

/**
 * Fetch active elimination rules for entity set and compute elimination amounts.
 * Iterates over rules (not entities) to avoid double-counting (Pitfall 2).
 * Uses absolute values before comparing (Pitfall 3).
 */
async function computeEliminations(
  entityIds: string[],
  entityDataMap: Map<string, IncomeStatementData | BalanceSheetData>
): Promise<{ eliminations: EliminationRow[]; mismatches: Mismatch[] }> {
  const rules = await prisma.eliminationRule.findMany({
    where: {
      isActive: true,
      entityAId: { in: entityIds },
      entityBId: { in: entityIds },
    },
    include: {
      accountA: { select: { type: true } },
    },
  });

  const eliminations: EliminationRow[] = [];
  const mismatches: Mismatch[] = [];

  for (const rule of rules) {
    const entityAData = entityDataMap.get(rule.entityAId);
    const entityBData = entityDataMap.get(rule.entityBId);
    if (!entityAData || !entityBData) continue;

    const balanceA = findAccountBalance(entityAData, rule.accountAId);
    const balanceB = findAccountBalance(entityBData, rule.accountBId);
    const absA = Math.abs(balanceA);
    const absB = Math.abs(balanceB);
    const eliminationAmount = Math.min(absA, absB);
    const difference = Math.abs(absA - absB);

    if (eliminationAmount > 0) {
      eliminations.push({
        ruleId: rule.id,
        label: rule.label,
        accountType: rule.accountA.type as AccountType,
        amount: -eliminationAmount, // always negative (reduces totals)
        mismatchAmount: difference > EPSILON ? difference : undefined,
      });
    }

    if (difference > EPSILON) {
      mismatches.push({ ruleLabel: rule.label, difference });
    }
  }

  return { eliminations, mismatches };
}

// ---------------------------------------------------------------------------
// Consolidated Income Statement
// ---------------------------------------------------------------------------

export async function getConsolidatedIncomeStatement(
  entityIds: string[],
  startDate: Date,
  endDate: Date,
  basis: "accrual" | "cash" = "accrual"
): Promise<ConsolidatedIncomeStatement> {
  // 1. Fetch entities with fiscal year info
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, name: true, fiscalYearEnd: true },
  });

  // 2. Fetch per-entity income statements in parallel (calendar date range always)
  const entityBreakdowns = await Promise.all(
    entities.map(async (entity) => ({
      entityId: entity.id,
      entityName: entity.name,
      fiscalYearEnd: entity.fiscalYearEnd,
      data: (await getIncomeStatement(
        entity.id,
        startDate,
        endDate,
        basis
      )) as IncomeStatementData,
    }))
  );

  // 3. Build data map for elimination lookup
  const entityDataMap = new Map<string, IncomeStatementData>();
  for (const eb of entityBreakdowns) {
    entityDataMap.set(eb.entityId, eb.data);
  }

  // 4. Compute eliminations
  const { eliminations, mismatches } = await computeEliminations(
    entityIds,
    entityDataMap
  );

  // 5. Aggregate totals: sum entity totals, subtract eliminations by type
  const rawTotalIncome = entityBreakdowns.reduce(
    (s, e) => s + e.data.totalIncome,
    0
  );
  const rawTotalExpenses = entityBreakdowns.reduce(
    (s, e) => s + e.data.totalExpenses,
    0
  );

  const incomeEliminations = eliminations
    .filter((e) => e.accountType === "INCOME")
    .reduce((s, e) => s + e.amount, 0);
  const expenseEliminations = eliminations
    .filter((e) => e.accountType === "EXPENSE")
    .reduce((s, e) => s + e.amount, 0);

  const totalIncome = rawTotalIncome + incomeEliminations;
  const totalExpenses = rawTotalExpenses + expenseEliminations;
  const netIncome = totalIncome - totalExpenses;

  return {
    entityBreakdowns,
    eliminations,
    mismatches,
    totalIncome,
    totalExpenses,
    netIncome,
  };
}

// ---------------------------------------------------------------------------
// Consolidated Balance Sheet
// ---------------------------------------------------------------------------

export async function getConsolidatedBalanceSheet(
  entityIds: string[],
  asOfDate: Date,
  basis: "accrual" | "cash" = "accrual"
): Promise<ConsolidatedBalanceSheet> {
  // 1. Fetch entities
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, name: true, fiscalYearEnd: true },
  });

  // 2. Fetch per-entity balance sheets in parallel
  const entityBreakdowns = await Promise.all(
    entities.map(async (entity) => ({
      entityId: entity.id,
      entityName: entity.name,
      fiscalYearEnd: entity.fiscalYearEnd,
      data: await getBalanceSheet(entity.id, asOfDate, basis),
    }))
  );

  // 3. Build data map for elimination lookup
  const entityDataMap = new Map<string, BalanceSheetData>();
  for (const eb of entityBreakdowns) {
    entityDataMap.set(eb.entityId, eb.data);
  }

  // 4. Compute eliminations
  const { eliminations, mismatches } = await computeEliminations(
    entityIds,
    entityDataMap
  );

  // 5. Aggregate totals minus eliminations by account type
  const rawTotalAssets = entityBreakdowns.reduce(
    (s, e) => s + e.data.totalAssets,
    0
  );
  const rawTotalLiabilities = entityBreakdowns.reduce(
    (s, e) => s + e.data.totalLiabilities,
    0
  );
  const rawTotalEquity = entityBreakdowns.reduce(
    (s, e) => s + e.data.totalEquity,
    0
  );

  const assetEliminations = eliminations
    .filter((e) => e.accountType === "ASSET")
    .reduce((s, e) => s + e.amount, 0);
  const liabilityEliminations = eliminations
    .filter((e) => e.accountType === "LIABILITY")
    .reduce((s, e) => s + e.amount, 0);
  const equityEliminations = eliminations
    .filter((e) => e.accountType === "EQUITY")
    .reduce((s, e) => s + e.amount, 0);

  return {
    entityBreakdowns,
    eliminations,
    mismatches,
    totalAssets: rawTotalAssets + assetEliminations,
    totalLiabilities: rawTotalLiabilities + liabilityEliminations,
    totalEquity: rawTotalEquity + equityEliminations,
  };
}

// ---------------------------------------------------------------------------
// Consolidated Cash Flow
// ---------------------------------------------------------------------------

export async function getConsolidatedCashFlow(
  entityIds: string[],
  startDate: Date,
  endDate: Date
): Promise<ConsolidatedCashFlow> {
  // 1. Fetch entities
  const entities = await prisma.entity.findMany({
    where: { id: { in: entityIds } },
    select: { id: true, name: true, fiscalYearEnd: true },
  });

  // 2. Fetch per-entity cash flow statements in parallel
  const entityBreakdowns = await Promise.all(
    entities.map(async (entity) => ({
      entityId: entity.id,
      entityName: entity.name,
      fiscalYearEnd: entity.fiscalYearEnd,
      data: await getCashFlowStatement(entity.id, startDate, endDate),
    }))
  );

  // 3. Aggregate sections: combine items from all entities
  const operatingItems: CashFlowItem[] = [];
  const investingItems: CashFlowItem[] = [];
  const financingItems: CashFlowItem[] = [];

  for (const eb of entityBreakdowns) {
    for (const item of eb.data.operating.items) {
      operatingItems.push(item);
    }
    for (const item of eb.data.investing.items) {
      investingItems.push(item);
    }
    for (const item of eb.data.financing.items) {
      financingItems.push(item);
    }
  }

  // 4. Fetch elimination rules for cash flow (using a dummy IncomeStatementData map
  // is not ideal -- for cash flow we fetch rules but compute from CF data differently).
  // Per plan: keep dedicated Eliminations section consistent across all three statements.
  const rules = await prisma.eliminationRule.findMany({
    where: {
      isActive: true,
      entityAId: { in: entityIds },
      entityBId: { in: entityIds },
    },
    include: {
      accountA: { select: { type: true } },
    },
  });

  const eliminations: EliminationRow[] = [];
  const mismatches: Mismatch[] = [];

  // For cash flow eliminations, use balance sheet data as the source of truth
  // for intercompany account balances (same accounts that appear in BS)
  // Fetch BS data for elimination calculation
  const bsPromises = entities.map(async (entity) => ({
    entityId: entity.id,
    data: await getBalanceSheet(entity.id, endDate),
  }));
  const bsResults = await Promise.all(bsPromises);
  const bsMap = new Map<string, BalanceSheetData>();
  for (const r of bsResults) {
    bsMap.set(r.entityId, r.data);
  }

  for (const rule of rules) {
    const entityAData = bsMap.get(rule.entityAId);
    const entityBData = bsMap.get(rule.entityBId);
    if (!entityAData || !entityBData) continue;

    const balanceA = findAccountBalance(entityAData, rule.accountAId);
    const balanceB = findAccountBalance(entityBData, rule.accountBId);
    const absA = Math.abs(balanceA);
    const absB = Math.abs(balanceB);
    const eliminationAmount = Math.min(absA, absB);
    const difference = Math.abs(absA - absB);

    if (eliminationAmount > 0) {
      eliminations.push({
        ruleId: rule.id,
        label: rule.label,
        accountType: rule.accountA.type as AccountType,
        amount: -eliminationAmount,
        mismatchAmount: difference > EPSILON ? difference : undefined,
      });
    }

    if (difference > EPSILON) {
      mismatches.push({ ruleLabel: rule.label, difference });
    }
  }

  // 5. Compute section totals
  const operatingTotal = operatingItems.reduce((s, i) => s + i.amount, 0);
  const investingTotal = investingItems.reduce((s, i) => s + i.amount, 0);
  const financingTotal = financingItems.reduce((s, i) => s + i.amount, 0);

  // 6. Cash balances: sum across entities
  const totalBeginningCash = entityBreakdowns.reduce(
    (s, e) => s + e.data.beginningCash,
    0
  );
  const totalEndingCash = entityBreakdowns.reduce(
    (s, e) => s + e.data.endingCash,
    0
  );
  const netChange = operatingTotal + investingTotal + financingTotal;

  return {
    entityBreakdowns,
    eliminations,
    mismatches,
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
    beginningCash: totalBeginningCash,
    endingCash: totalEndingCash,
  };
}
