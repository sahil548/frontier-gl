import type { AccountType } from "@/generated/prisma/client";

/**
 * Maps SubledgerItemType to GL parent account prefix and account type.
 * Used for auto-creating GL accounts when holdings and positions are created.
 *
 * Assets (1xxxx):
 *   11000 Bank Accounts, 12000 Brokerage, 12500 Trust, 13000 Private Funds,
 *   14000 Notes Receivable, 16000 Real Estate, 17000 Equipment,
 *   18000 Operating Business, 19000 Other
 *
 * Liabilities (2xxxx):
 *   21000 Credit Cards, 22000 Loans, 23000 Mortgages, 24000 Lines of Credit
 */
export const HOLDING_TYPE_TO_GL: Record<
  string,
  { parentPrefix: string; accountType: AccountType }
> = {
  // New canonical types (13)
  BANK_ACCOUNT: { parentPrefix: "11000", accountType: "ASSET" },
  BROKERAGE_ACCOUNT: { parentPrefix: "12000", accountType: "ASSET" },
  TRUST_ACCOUNT: { parentPrefix: "12500", accountType: "ASSET" },
  PRIVATE_FUND: { parentPrefix: "13000", accountType: "ASSET" },
  NOTES_RECEIVABLE: { parentPrefix: "14000", accountType: "ASSET" },
  REAL_ESTATE: { parentPrefix: "16000", accountType: "ASSET" },
  EQUIPMENT: { parentPrefix: "17000", accountType: "ASSET" },
  OPERATING_BUSINESS: { parentPrefix: "18000", accountType: "ASSET" },
  OTHER: { parentPrefix: "19000", accountType: "ASSET" },
  CREDIT_CARD: { parentPrefix: "21000", accountType: "LIABILITY" },
  LOAN: { parentPrefix: "22000", accountType: "LIABILITY" },
  MORTGAGE: { parentPrefix: "23000", accountType: "LIABILITY" },
  LINE_OF_CREDIT: { parentPrefix: "24000", accountType: "LIABILITY" },
  // Legacy types (backward compat -- map to same prefixes as replacements)
  INVESTMENT: { parentPrefix: "12000", accountType: "ASSET" },
  PRIVATE_EQUITY: { parentPrefix: "13000", accountType: "ASSET" },
  RECEIVABLE: { parentPrefix: "14000", accountType: "ASSET" },
};

/**
 * Default position name per holding type.
 * Used when auto-creating the initial default position during holding creation
 * or data migration backfill.
 */
export const DEFAULT_POSITION_NAME: Record<string, string> = {
  // New canonical types (13)
  BANK_ACCOUNT: "Cash",
  BROKERAGE_ACCOUNT: "Cash",
  CREDIT_CARD: "Balance",
  REAL_ESTATE: "Property",
  EQUIPMENT: "Equipment",
  LOAN: "Principal",
  PRIVATE_FUND: "LP Interest",
  MORTGAGE: "Principal",
  LINE_OF_CREDIT: "Balance",
  TRUST_ACCOUNT: "Corpus",
  OPERATING_BUSINESS: "Equity Interest",
  NOTES_RECEIVABLE: "Note",
  OTHER: "General",
  // Legacy types (backward compat)
  INVESTMENT: "Cash",
  PRIVATE_EQUITY: "LP Interest",
  RECEIVABLE: "Note",
};

/**
 * Maps SubledgerItemType to default PositionType for the auto-created position.
 */
export const DEFAULT_POSITION_TYPE: Record<string, string> = {
  BANK_ACCOUNT: "CASH",
  BROKERAGE_ACCOUNT: "CASH",
  CREDIT_CARD: "CASH",
  TRUST_ACCOUNT: "CASH",
  REAL_ESTATE: "REAL_PROPERTY",
  EQUIPMENT: "OTHER",
  LOAN: "OTHER",
  MORTGAGE: "OTHER",
  LINE_OF_CREDIT: "OTHER",
  PRIVATE_FUND: "PRIVATE_EQUITY",
  OPERATING_BUSINESS: "OTHER",
  NOTES_RECEIVABLE: "OTHER",
  OTHER: "OTHER",
  // Legacy
  INVESTMENT: "CASH",
  PRIVATE_EQUITY: "PRIVATE_EQUITY",
  RECEIVABLE: "OTHER",
};
