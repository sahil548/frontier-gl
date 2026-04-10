import type {
  ReportRow,
  IncomeStatementData,
  BalanceSheetData,
  CashFlowStatement,
  CashFlowSection,
} from "@/lib/queries/report-queries";
import type { AccountType } from "@/generated/prisma/enums";

export interface EntityBreakdown {
  entityId: string;
  entityName: string;
  fiscalYearEnd: string;
}

export interface ConsolidatedReportRow extends ReportRow {
  entityId: string;
  entityName: string;
}

export interface EliminationRow {
  ruleId: string;
  label: string;
  accountType: AccountType;
  amount: number;
  mismatchAmount?: number;
}

export interface Mismatch {
  ruleLabel: string;
  difference: number;
}

export interface ConsolidatedIncomeStatement {
  entityBreakdowns: (EntityBreakdown & { data: IncomeStatementData })[];
  eliminations: EliminationRow[];
  mismatches: Mismatch[];
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
}

export interface ConsolidatedBalanceSheet {
  entityBreakdowns: (EntityBreakdown & { data: BalanceSheetData })[];
  eliminations: EliminationRow[];
  mismatches: Mismatch[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}

export interface ConsolidatedCashFlow {
  entityBreakdowns: (EntityBreakdown & { data: CashFlowStatement })[];
  eliminations: EliminationRow[];
  mismatches: Mismatch[];
  operating: CashFlowSection;
  investing: CashFlowSection;
  financing: CashFlowSection;
  netChange: number;
  beginningCash: number;
  endingCash: number;
}

export interface EliminationRuleInput {
  label: string;
  entityAId: string;
  accountAId: string;
  entityBId: string;
  accountBId: string;
}

export interface SerializedEliminationRule {
  id: string;
  label: string;
  entityAId: string;
  entityAName: string;
  accountAId: string;
  accountANumber: string;
  accountAName: string;
  entityBId: string;
  entityBName: string;
  accountBId: string;
  accountBNumber: string;
  accountBName: string;
  isActive: boolean;
  createdAt: string;
}
