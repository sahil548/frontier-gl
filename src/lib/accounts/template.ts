import type { AccountType } from "@/generated/prisma/enums";

// ─── Template Account Type ────────────────────────────────

interface TemplateAccount {
  number: string;
  name: string;
  type: AccountType;
  parentNumber?: string;
}

// ─── Family Office Standard Template ──────────────────────

/**
 * Family Office Standard chart of accounts template.
 * ~40 accounts covering typical family office operations.
 * 5-digit numbering: 10000s Assets, 20000s Liabilities,
 * 30000s Equity, 40000s Income, 50000s+ Expenses.
 * Sub-accounts in 100 increments.
 */
export const FAMILY_OFFICE_TEMPLATE: TemplateAccount[] = [
  // ── Assets ──
  { number: "10000", name: "Assets", type: "ASSET" },
  { number: "10100", name: "Cash and Cash Equivalents", type: "ASSET", parentNumber: "10000" },
  { number: "10200", name: "Investment Accounts", type: "ASSET", parentNumber: "10000" },
  { number: "10300", name: "Receivables", type: "ASSET", parentNumber: "10000" },
  { number: "10400", name: "Other Assets", type: "ASSET", parentNumber: "10000" },
  { number: "10500", name: "Real Estate Holdings", type: "ASSET", parentNumber: "10000" },
  { number: "10600", name: "Private Equity Investments", type: "ASSET", parentNumber: "10000" },

  // ── Liabilities ──
  { number: "20000", name: "Liabilities", type: "LIABILITY" },
  { number: "20100", name: "Accounts Payable", type: "LIABILITY", parentNumber: "20000" },
  { number: "20200", name: "Loans Payable", type: "LIABILITY", parentNumber: "20000" },
  { number: "20300", name: "Accrued Expenses", type: "LIABILITY", parentNumber: "20000" },
  { number: "20400", name: "Credit Lines", type: "LIABILITY", parentNumber: "20000" },
  { number: "20500", name: "Other Liabilities", type: "LIABILITY", parentNumber: "20000" },

  // ── Equity ──
  { number: "30000", name: "Equity", type: "EQUITY" },
  { number: "30100", name: "Partner Capital - LP", type: "EQUITY", parentNumber: "30000" },
  { number: "30200", name: "Partner Capital - GP", type: "EQUITY", parentNumber: "30000" },
  { number: "30300", name: "Retained Earnings", type: "EQUITY", parentNumber: "30000" },
  { number: "30400", name: "Distributions", type: "EQUITY", parentNumber: "30000" },
  { number: "30500", name: "Owner Contributions", type: "EQUITY", parentNumber: "30000" },
  { number: "30600", name: "Owner Draws", type: "EQUITY", parentNumber: "30000" },

  // ── Income ──
  { number: "40000", name: "Income", type: "INCOME" },
  { number: "40100", name: "Management Fees", type: "INCOME", parentNumber: "40000" },
  { number: "40200", name: "Realized Gains", type: "INCOME", parentNumber: "40000" },
  { number: "40300", name: "Unrealized Gains", type: "INCOME", parentNumber: "40000" },
  { number: "40400", name: "Dividend Income", type: "INCOME", parentNumber: "40000" },
  { number: "40500", name: "Interest Income", type: "INCOME", parentNumber: "40000" },
  { number: "40600", name: "K-1 Allocations", type: "INCOME", parentNumber: "40000" },
  { number: "40700", name: "Rental Income", type: "INCOME", parentNumber: "40000" },
  { number: "40800", name: "Other Income", type: "INCOME", parentNumber: "40000" },

  // ── Expenses ──
  { number: "50000", name: "Expenses", type: "EXPENSE" },
  { number: "50100", name: "Management Fees Expense", type: "EXPENSE", parentNumber: "50000" },
  { number: "50200", name: "Fund Administration", type: "EXPENSE", parentNumber: "50000" },
  { number: "50300", name: "Legal and Professional", type: "EXPENSE", parentNumber: "50000" },
  { number: "50400", name: "Accounting Fees", type: "EXPENSE", parentNumber: "50000" },
  { number: "50500", name: "Insurance", type: "EXPENSE", parentNumber: "50000" },
  { number: "50600", name: "Office Expenses", type: "EXPENSE", parentNumber: "50000" },
  { number: "50700", name: "Travel and Entertainment", type: "EXPENSE", parentNumber: "50000" },
  { number: "50800", name: "Technology and Software", type: "EXPENSE", parentNumber: "50000" },
  { number: "50900", name: "Custodian Fees", type: "EXPENSE", parentNumber: "50000" },
  { number: "51000", name: "Bank Charges", type: "EXPENSE", parentNumber: "50000" },
  { number: "51100", name: "Depreciation", type: "EXPENSE", parentNumber: "50000" },
  { number: "51200", name: "Other Expenses", type: "EXPENSE", parentNumber: "50000" },
];

// ─── Template Apply Logic ─────────────────────────────────

type PrismaTransaction = Parameters<Parameters<typeof import("@/lib/db/prisma").prisma.$transaction>[0]>[0];

/**
 * Applies the Family Office Standard template to an entity.
 * Skips accounts whose number already exists for the entity (merge logic).
 *
 * @param entityId - The entity to apply the template to
 * @param tx - Optional Prisma transaction client
 * @returns Count of inserted and skipped accounts
 */
export async function applyTemplate(
  entityId: string,
  tx?: PrismaTransaction
) {
  // Dynamic import to avoid circular dependency issues
  const { prisma } = await import("@/lib/db/prisma");
  const client = tx || prisma;

  // Get existing account numbers for this entity
  const existingAccounts = await client.account.findMany({
    where: { entityId },
    select: { id: true, number: true },
  });
  const existingNumbers = new Set(existingAccounts.map((a) => a.number));

  // Build a map of number -> id for parent lookups
  const numberToId = new Map<string, string>();
  for (const acct of existingAccounts) {
    numberToId.set(acct.number, acct.id);
  }

  let inserted = 0;
  let skipped = 0;

  // Process in order (parents first, then children)
  for (const templateAccount of FAMILY_OFFICE_TEMPLATE) {
    if (existingNumbers.has(templateAccount.number)) {
      skipped++;
      continue;
    }

    // Resolve parent ID
    let parentId: string | undefined;
    if (templateAccount.parentNumber) {
      parentId = numberToId.get(templateAccount.parentNumber);
    }

    const created = await client.account.create({
      data: {
        entityId,
        number: templateAccount.number,
        name: templateAccount.name,
        type: templateAccount.type,
        parentId,
      },
    });

    numberToId.set(templateAccount.number, created.id);
    existingNumbers.add(templateAccount.number);
    inserted++;
  }

  return { inserted, skipped };
}
