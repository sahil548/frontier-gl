/**
 * Seed script: wipes all data and creates 3 entities with 3 months of transactions.
 *
 * Run: npx tsx prisma/seed.ts
 */

import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const CLERK_USER_ID = "user_3BVaGDpoVT7Xe9EnJYJppTQmMVh";
const USER_EMAIL = "sahil@calafiagroup.com";

// ─── COA Template ────────────────────────────────────────
// Shared across all 3 entities

const COA = [
  // Assets
  { number: "10000", name: "Assets", type: "ASSET" as const, parent: null },
  { number: "10100", name: "Cash and Cash Equivalents", type: "ASSET" as const, parent: "10000" },
  { number: "10200", name: "Investment Accounts", type: "ASSET" as const, parent: "10000" },
  { number: "10300", name: "Receivables", type: "ASSET" as const, parent: "10000" },
  { number: "10400", name: "Prepaid Expenses", type: "ASSET" as const, parent: "10000" },
  { number: "10500", name: "Real Estate Holdings", type: "ASSET" as const, parent: "10000" },
  { number: "10600", name: "Private Equity Investments", type: "ASSET" as const, parent: "10000" },
  // Liabilities
  { number: "20000", name: "Liabilities", type: "LIABILITY" as const, parent: null },
  { number: "20100", name: "Accounts Payable", type: "LIABILITY" as const, parent: "20000" },
  { number: "20200", name: "Loans Payable", type: "LIABILITY" as const, parent: "20000" },
  { number: "20300", name: "Accrued Expenses", type: "LIABILITY" as const, parent: "20000" },
  // Equity
  { number: "30000", name: "Equity", type: "EQUITY" as const, parent: null },
  { number: "30100", name: "Owner Equity", type: "EQUITY" as const, parent: "30000" },
  { number: "30200", name: "Retained Earnings", type: "EQUITY" as const, parent: "30000" },
  { number: "30300", name: "Distributions", type: "EQUITY" as const, parent: "30000" },
  // Income
  { number: "40000", name: "Income", type: "INCOME" as const, parent: null },
  { number: "40100", name: "Management Fees", type: "INCOME" as const, parent: "40000" },
  { number: "40200", name: "Realized Gains", type: "INCOME" as const, parent: "40000" },
  { number: "40300", name: "Dividend Income", type: "INCOME" as const, parent: "40000" },
  { number: "40400", name: "Interest Income", type: "INCOME" as const, parent: "40000" },
  { number: "40500", name: "Rental Income", type: "INCOME" as const, parent: "40000" },
  { number: "40600", name: "K-1 Allocations", type: "INCOME" as const, parent: "40000" },
  // Expenses
  { number: "50000", name: "Expenses", type: "EXPENSE" as const, parent: null },
  { number: "50100", name: "Management Fees Expense", type: "EXPENSE" as const, parent: "50000" },
  { number: "50200", name: "Legal and Professional", type: "EXPENSE" as const, parent: "50000" },
  { number: "50300", name: "Accounting and Tax", type: "EXPENSE" as const, parent: "50000" },
  { number: "50400", name: "Insurance", type: "EXPENSE" as const, parent: "50000" },
  { number: "50500", name: "Office Expenses", type: "EXPENSE" as const, parent: "50000" },
  { number: "50600", name: "Travel and Entertainment", type: "EXPENSE" as const, parent: "50000" },
  { number: "50700", name: "Bank Charges", type: "EXPENSE" as const, parent: "50000" },
  { number: "50800", name: "Depreciation", type: "EXPENSE" as const, parent: "50000" },
  { number: "50900", name: "Interest Expense", type: "EXPENSE" as const, parent: "50000" },
];

// ─── Transaction Templates per Entity ────────────────────

interface JETemplate {
  date: string;
  description: string;
  lines: { account: string; debit: number; credit: number; memo?: string }[];
}

function getEntityTransactions(entityName: string): JETemplate[] {
  if (entityName === "Blue Paw, LLC") {
    return [
      // January 2026
      { date: "2026-01-05", description: "Initial capital contribution", lines: [
        { account: "10100", debit: 500000, credit: 0, memo: "Wire from personal account" },
        { account: "30100", debit: 0, credit: 500000, memo: "Owner investment" },
      ]},
      { date: "2026-01-10", description: "Investment in PE fund", lines: [
        { account: "10600", debit: 200000, credit: 0, memo: "Fund III commitment" },
        { account: "10100", debit: 0, credit: 200000, memo: "Wire to fund admin" },
      ]},
      { date: "2026-01-15", description: "Management fee income", lines: [
        { account: "10100", debit: 25000, credit: 0 },
        { account: "40100", debit: 0, credit: 25000, memo: "Q1 management fee" },
      ]},
      { date: "2026-01-20", description: "Legal fees - fund formation", lines: [
        { account: "50200", debit: 8500, credit: 0, memo: "Outside counsel" },
        { account: "10100", debit: 0, credit: 8500 },
      ]},
      { date: "2026-01-31", description: "January rent and office", lines: [
        { account: "50500", debit: 3200, credit: 0, memo: "Office rent" },
        { account: "50400", debit: 1800, credit: 0, memo: "D&O insurance" },
        { account: "20100", debit: 0, credit: 5000 },
      ]},
      // February 2026
      { date: "2026-02-05", description: "Dividend income received", lines: [
        { account: "10100", debit: 12000, credit: 0 },
        { account: "40300", debit: 0, credit: 12000, memo: "Portfolio dividends" },
      ]},
      { date: "2026-02-10", description: "Pay outstanding AP", lines: [
        { account: "20100", debit: 5000, credit: 0 },
        { account: "10100", debit: 0, credit: 5000 },
      ]},
      { date: "2026-02-15", description: "Management fee income - Feb", lines: [
        { account: "10100", debit: 25000, credit: 0 },
        { account: "40100", debit: 0, credit: 25000 },
      ]},
      { date: "2026-02-20", description: "Accounting and tax prep", lines: [
        { account: "50300", debit: 15000, credit: 0, memo: "Annual tax preparation" },
        { account: "20100", debit: 0, credit: 15000 },
      ]},
      { date: "2026-02-28", description: "February office expenses", lines: [
        { account: "50500", debit: 3200, credit: 0, memo: "Office rent" },
        { account: "50700", debit: 150, credit: 0, memo: "Wire fees" },
        { account: "10100", debit: 0, credit: 3350 },
      ]},
      { date: "2026-02-28", description: "K-1 allocation from Fund II", lines: [
        { account: "10300", debit: 45000, credit: 0, memo: "K-1 receivable" },
        { account: "40600", debit: 0, credit: 45000, memo: "2025 K-1 income" },
      ]},
      // March 2026
      { date: "2026-03-05", description: "Realized gains on securities", lines: [
        { account: "10100", debit: 35000, credit: 0, memo: "Proceeds from sale" },
        { account: "10200", debit: 0, credit: 28000, memo: "Cost basis" },
        { account: "40200", debit: 0, credit: 7000, memo: "Net gain" },
      ]},
      { date: "2026-03-10", description: "Pay AP - accounting fees", lines: [
        { account: "20100", debit: 15000, credit: 0 },
        { account: "10100", debit: 0, credit: 15000 },
      ]},
      { date: "2026-03-15", description: "Management fee income - Mar", lines: [
        { account: "10100", debit: 25000, credit: 0 },
        { account: "40100", debit: 0, credit: 25000 },
      ]},
      { date: "2026-03-20", description: "Owner distribution", lines: [
        { account: "30300", debit: 50000, credit: 0, memo: "Q1 distribution" },
        { account: "10100", debit: 0, credit: 50000 },
      ]},
      { date: "2026-03-31", description: "March expenses", lines: [
        { account: "50500", debit: 3200, credit: 0, memo: "Office rent" },
        { account: "50600", debit: 2800, credit: 0, memo: "Client dinner" },
        { account: "50700", debit: 75, credit: 0, memo: "Bank fees" },
        { account: "10100", debit: 0, credit: 6075 },
      ]},
    ];
  }

  if (entityName === "The Better Company, Inc.") {
    return [
      // January 2026
      { date: "2026-01-02", description: "Capital contribution", lines: [
        { account: "10100", debit: 250000, credit: 0 },
        { account: "30100", debit: 0, credit: 250000 },
      ]},
      { date: "2026-01-10", description: "Purchase marketable securities", lines: [
        { account: "10200", debit: 150000, credit: 0, memo: "Equity portfolio" },
        { account: "10100", debit: 0, credit: 150000 },
      ]},
      { date: "2026-01-25", description: "Consulting revenue", lines: [
        { account: "10300", debit: 40000, credit: 0 },
        { account: "40100", debit: 0, credit: 40000, memo: "Advisory services" },
      ]},
      { date: "2026-01-31", description: "January operating expenses", lines: [
        { account: "50400", debit: 2400, credit: 0, memo: "E&O insurance" },
        { account: "50500", debit: 4500, credit: 0, memo: "Office lease" },
        { account: "50200", debit: 3000, credit: 0, memo: "Legal retainer" },
        { account: "10100", debit: 0, credit: 9900 },
      ]},
      // February 2026
      { date: "2026-02-01", description: "Collect January receivables", lines: [
        { account: "10100", debit: 40000, credit: 0 },
        { account: "10300", debit: 0, credit: 40000 },
      ]},
      { date: "2026-02-10", description: "Interest income on bonds", lines: [
        { account: "10100", debit: 3500, credit: 0 },
        { account: "40400", debit: 0, credit: 3500, memo: "Semi-annual coupon" },
      ]},
      { date: "2026-02-15", description: "Consulting revenue - Feb", lines: [
        { account: "10300", debit: 40000, credit: 0 },
        { account: "40100", debit: 0, credit: 40000 },
      ]},
      { date: "2026-02-28", description: "February expenses", lines: [
        { account: "50500", debit: 4500, credit: 0, memo: "Office lease" },
        { account: "50300", debit: 5000, credit: 0, memo: "Bookkeeping" },
        { account: "50700", debit: 200, credit: 0, memo: "Bank and wire fees" },
        { account: "20100", debit: 0, credit: 9700 },
      ]},
      // March 2026
      { date: "2026-03-01", description: "Collect Feb receivables", lines: [
        { account: "10100", debit: 40000, credit: 0 },
        { account: "10300", debit: 0, credit: 40000 },
      ]},
      { date: "2026-03-10", description: "Dividend income", lines: [
        { account: "10100", debit: 5200, credit: 0 },
        { account: "40300", debit: 0, credit: 5200, memo: "Q1 dividends" },
      ]},
      { date: "2026-03-15", description: "Pay outstanding AP", lines: [
        { account: "20100", debit: 9700, credit: 0 },
        { account: "10100", debit: 0, credit: 9700 },
      ]},
      { date: "2026-03-20", description: "Consulting revenue - Mar", lines: [
        { account: "10300", debit: 45000, credit: 0 },
        { account: "40100", debit: 0, credit: 45000, memo: "Advisory + special project" },
      ]},
      { date: "2026-03-31", description: "March expenses", lines: [
        { account: "50500", debit: 4500, credit: 0, memo: "Office lease" },
        { account: "50600", debit: 1500, credit: 0, memo: "Business travel" },
        { account: "50400", debit: 2400, credit: 0, memo: "Insurance" },
        { account: "10100", debit: 0, credit: 8400 },
      ]},
    ];
  }

  // Starlake Trust
  return [
    // January 2026
    { date: "2026-01-03", description: "Trust funding", lines: [
      { account: "10100", debit: 1000000, credit: 0, memo: "Initial trust funding" },
      { account: "30100", debit: 0, credit: 1000000, memo: "Trust corpus" },
    ]},
    { date: "2026-01-08", description: "Purchase real estate", lines: [
      { account: "10500", debit: 450000, credit: 0, memo: "123 Main St property" },
      { account: "10100", debit: 0, credit: 450000 },
    ]},
    { date: "2026-01-15", description: "Mortgage on property", lines: [
      { account: "10100", debit: 300000, credit: 0 },
      { account: "20200", debit: 0, credit: 300000, memo: "30-year fixed" },
    ]},
    { date: "2026-01-20", description: "Prepaid insurance", lines: [
      { account: "10400", debit: 12000, credit: 0, memo: "Annual property insurance" },
      { account: "10100", debit: 0, credit: 12000 },
    ]},
    { date: "2026-01-31", description: "January rental income", lines: [
      { account: "10100", debit: 8500, credit: 0 },
      { account: "40500", debit: 0, credit: 8500, memo: "Tenant rent" },
    ]},
    { date: "2026-01-31", description: "January trust expenses", lines: [
      { account: "50900", debit: 1250, credit: 0, memo: "Mortgage interest" },
      { account: "50800", debit: 1500, credit: 0, memo: "Property depreciation" },
      { account: "50400", debit: 1000, credit: 0, memo: "Insurance (monthly)" },
      { account: "20300", debit: 0, credit: 3750 },
    ]},
    // February 2026
    { date: "2026-02-05", description: "Investment in index fund", lines: [
      { account: "10200", debit: 200000, credit: 0, memo: "S&P 500 index" },
      { account: "10100", debit: 0, credit: 200000 },
    ]},
    { date: "2026-02-15", description: "Trustee fee", lines: [
      { account: "50100", debit: 5000, credit: 0, memo: "Quarterly trustee fee" },
      { account: "10100", debit: 0, credit: 5000 },
    ]},
    { date: "2026-02-28", description: "February rental income", lines: [
      { account: "10100", debit: 8500, credit: 0 },
      { account: "40500", debit: 0, credit: 8500 },
    ]},
    { date: "2026-02-28", description: "February trust expenses", lines: [
      { account: "50900", debit: 1250, credit: 0, memo: "Mortgage interest" },
      { account: "50800", debit: 1500, credit: 0, memo: "Depreciation" },
      { account: "50400", debit: 1000, credit: 0, memo: "Insurance" },
      { account: "50200", debit: 4500, credit: 0, memo: "Trust attorney" },
      { account: "20300", debit: 0, credit: 8250 },
    ]},
    { date: "2026-02-28", description: "Dividend income on index fund", lines: [
      { account: "10100", debit: 1800, credit: 0 },
      { account: "40300", debit: 0, credit: 1800 },
    ]},
    // March 2026
    { date: "2026-03-01", description: "Pay accrued expenses", lines: [
      { account: "20300", debit: 12000, credit: 0 },
      { account: "10100", debit: 0, credit: 12000 },
    ]},
    { date: "2026-03-10", description: "Trust distribution to beneficiary", lines: [
      { account: "30300", debit: 15000, credit: 0, memo: "Monthly distribution" },
      { account: "10100", debit: 0, credit: 15000 },
    ]},
    { date: "2026-03-15", description: "Property maintenance", lines: [
      { account: "50500", debit: 2800, credit: 0, memo: "HVAC repair" },
      { account: "10100", debit: 0, credit: 2800 },
    ]},
    { date: "2026-03-31", description: "March rental income", lines: [
      { account: "10100", debit: 8500, credit: 0 },
      { account: "40500", debit: 0, credit: 8500 },
    ]},
    { date: "2026-03-31", description: "March trust expenses", lines: [
      { account: "50900", debit: 1250, credit: 0, memo: "Mortgage interest" },
      { account: "50800", debit: 1500, credit: 0, memo: "Depreciation" },
      { account: "50400", debit: 1000, credit: 0, memo: "Insurance" },
      { account: "20300", debit: 0, credit: 3750 },
    ]},
  ];
}

// ─── Main Seed ───────────────────────────────────────────

async function main() {
  console.log("🗑️  Wiping all data...");

  // Temporarily disable triggers that prevent deleting posted JE data
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_posted_line_immutable ON journal_entry_lines`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_posted_je_immutable ON journal_entries`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_validate_je_balance ON journal_entry_lines`);
  await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_check_closed_period ON journal_entries`);

  // Delete in dependency order (leaves → roots)
  await prisma.bankReconciliationLine.deleteMany();
  await prisma.bankReconciliation.deleteMany();
  await prisma.position.deleteMany();
  await prisma.subledgerItem.deleteMany();
  await prisma.journalEntryAudit.deleteMany();
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.journalEntryTemplateLine.deleteMany();
  await prisma.journalEntryTemplate.deleteMany();
  await prisma.periodClose.deleteMany();
  await prisma.accountBalance.deleteMany();
  await prisma.account.deleteMany();
  await prisma.entityAccess.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Data wiped\n");

  // Create user
  console.log("👤 Creating user...");
  const user = await prisma.user.create({
    data: {
      clerkId: CLERK_USER_ID,
      email: USER_EMAIL,
      name: "Sahil Nandwani",
    },
  });

  const entities = [
    { name: "Blue Paw, LLC", type: "LLC" as const, fiscalYearEnd: "12-31" },
    { name: "The Better Company, Inc.", type: "CORPORATION" as const, fiscalYearEnd: "12-31" },
    { name: "Starlake Trust", type: "TRUST" as const, fiscalYearEnd: "12-31" },
  ];

  for (const entityDef of entities) {
    console.log(`\n🏢 Creating entity: ${entityDef.name}`);
    const entity = await prisma.entity.create({
      data: {
        name: entityDef.name,
        type: entityDef.type,
        fiscalYearEnd: entityDef.fiscalYearEnd,
        createdById: user.id,
      },
    });

    // Grant OWNER access to the creator
    await prisma.entityAccess.create({
      data: { entityId: entity.id, userId: user.id, role: "OWNER" },
    });

    // Create COA
    console.log(`  📊 Creating ${COA.length} accounts...`);
    const numberToId = new Map<string, string>();

    // Parents first
    for (const acct of COA.filter((a) => !a.parent)) {
      const created = await prisma.account.create({
        data: {
          entityId: entity.id,
          number: acct.number,
          name: acct.name,
          type: acct.type,
        },
      });
      await prisma.accountBalance.create({
        data: { accountId: created.id, debitTotal: 0, creditTotal: 0, balance: 0 },
      });
      numberToId.set(acct.number, created.id);
    }
    // Children
    for (const acct of COA.filter((a) => a.parent)) {
      const created = await prisma.account.create({
        data: {
          entityId: entity.id,
          number: acct.number,
          name: acct.name,
          type: acct.type,
          parentId: numberToId.get(acct.parent!)!,
        },
      });
      await prisma.accountBalance.create({
        data: { accountId: created.id, debitTotal: 0, creditTotal: 0, balance: 0 },
      });
      numberToId.set(acct.number, created.id);
    }

    // Create journal entries
    const transactions = getEntityTransactions(entityDef.name);
    console.log(`  📝 Creating ${transactions.length} journal entries...`);

    let jeNum = 0;
    for (const txn of transactions) {
      jeNum++;
      const entryNumber = `JE-${String(jeNum).padStart(3, "0")}`;

      // Create as APPROVED first
      const je = await prisma.journalEntry.create({
        data: {
          entityId: entity.id,
          entryNumber,
          date: new Date(txn.date),
          description: txn.description,
          status: "POSTED",
          createdBy: CLERK_USER_ID,
          approvedBy: CLERK_USER_ID,
          postedBy: CLERK_USER_ID,
          approvedAt: new Date(txn.date),
          postedAt: new Date(txn.date),
          lineItems: {
            create: txn.lines.map((line, idx) => ({
              accountId: numberToId.get(line.account)!,
              debit: line.debit,
              credit: line.credit,
              memo: line.memo || null,
              sortOrder: idx,
            })),
          },
        },
      });

      // Update account balances
      for (const line of txn.lines) {
        const accountId = numberToId.get(line.account)!;
        await prisma.accountBalance.update({
          where: { accountId },
          data: {
            debitTotal: { increment: line.debit },
            creditTotal: { increment: line.credit },
            balance: { increment: line.debit - line.credit },
          },
        });
      }

      // Audit trail
      await prisma.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "CREATED",
          userId: CLERK_USER_ID,
        },
      });
      await prisma.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "POSTED",
          userId: CLERK_USER_ID,
        },
      });
    }

    // ─── Subledger Items (Holdings) ───────────────────────────
    console.log(`  💼 Creating subledger items...`);

    interface HoldingDef {
      name: string;
      itemType: "BANK_ACCOUNT" | "INVESTMENT" | "REAL_ESTATE" | "LOAN" | "PRIVATE_EQUITY";
      accountNumber: string;
      currentBalance: number;
      costBasis?: number;
      fairMarketValue?: number;
      counterparty?: string;
      interestRate?: number;
      maturityDate?: string;
    }

    interface PositionDef {
      holdingName: string;
      name: string;
      positionType: "CASH" | "PUBLIC_EQUITY" | "ETF" | "MUTUAL_FUND" | "REAL_PROPERTY";
      quantity?: number;
      unitCost?: number;
      unitPrice?: number;
      costBasis?: number;
      marketValue?: number;
      ticker?: string;
      assetClass?: string;
    }

    let holdingDefs: HoldingDef[] = [];
    let positionDefs: PositionDef[] = [];
    let cashBalancesByMonth: { jan: number; feb: number } = { jan: 0, feb: 0 };

    if (entityDef.name === "Blue Paw, LLC") {
      holdingDefs = [
        { name: "Chase Operating #8844", itemType: "BANK_ACCOUNT", accountNumber: "10100", currentBalance: 334075 },
        { name: "Schwab Brokerage", itemType: "INVESTMENT", accountNumber: "10200", currentBalance: 122000 },
        { name: "Fund III — ABC Capital", itemType: "PRIVATE_EQUITY", accountNumber: "10600", costBasis: 200000, currentBalance: 200000 },
      ];
      positionDefs = [
        { holdingName: "Schwab Brokerage", name: "AAPL", positionType: "PUBLIC_EQUITY", quantity: 200, unitCost: 185, unitPrice: 195, ticker: "AAPL", assetClass: "Large Cap" },
        { holdingName: "Schwab Brokerage", name: "MSFT", positionType: "PUBLIC_EQUITY", quantity: 150, unitCost: 380, unitPrice: 410, ticker: "MSFT", assetClass: "Large Cap" },
        { holdingName: "Schwab Brokerage", name: "Cash Sweep", positionType: "CASH", marketValue: 3000 },
      ];
      cashBalancesByMonth = { jan: 316500, feb: 345150 };
    } else if (entityDef.name === "The Better Company, Inc.") {
      holdingDefs = [
        { name: "Chase Operating #4421", itemType: "BANK_ACCOUNT", accountNumber: "10100", currentBalance: 160700 },
        { name: "Fidelity Portfolio", itemType: "INVESTMENT", accountNumber: "10200", currentBalance: 150000 },
      ];
      positionDefs = [
        { holdingName: "Fidelity Portfolio", name: "VOO", positionType: "ETF", quantity: 250, unitCost: 420, unitPrice: 445, ticker: "VOO", assetClass: "US Equity" },
        { holdingName: "Fidelity Portfolio", name: "BND", positionType: "ETF", quantity: 300, unitCost: 72, unitPrice: 74, ticker: "BND", assetClass: "Fixed Income" },
        { holdingName: "Fidelity Portfolio", name: "Cash", positionType: "CASH", marketValue: 21400 },
      ];
      cashBalancesByMonth = { jan: 90100, feb: 133600 };
    } else {
      // Starlake Trust
      holdingDefs = [
        { name: "Wells Fargo Trust #6677", itemType: "BANK_ACCOUNT", accountNumber: "10100", currentBalance: 630500 },
        { name: "123 Main St Property", itemType: "REAL_ESTATE", accountNumber: "10500", costBasis: 450000, fairMarketValue: 475000, currentBalance: 475000 },
        { name: "Vanguard Index Fund", itemType: "INVESTMENT", accountNumber: "10200", currentBalance: 200000 },
        { name: "Property Mortgage", itemType: "LOAN", accountNumber: "20200", currentBalance: 300000, interestRate: 0.065, maturityDate: "2056-01-15", counterparty: "Wells Fargo" },
      ];
      positionDefs = [
        { holdingName: "Vanguard Index Fund", name: "VTSAX", positionType: "MUTUAL_FUND", quantity: 500, unitCost: 380, unitPrice: 400, ticker: "VTSAX", assetClass: "US Total Market" },
        { holdingName: "123 Main St Property", name: "Land", positionType: "REAL_PROPERTY", costBasis: 150000, marketValue: 165000 },
        { holdingName: "123 Main St Property", name: "Building", positionType: "REAL_PROPERTY", costBasis: 300000, marketValue: 310000 },
      ];
      cashBalancesByMonth = { jan: 846500, feb: 651800 };
    }

    // Create subledger items and collect references
    const holdingMap = new Map<string, string>(); // name -> id
    let bankItemId: string | null = null;

    for (const h of holdingDefs) {
      const item = await prisma.subledgerItem.create({
        data: {
          entityId: entity.id,
          accountId: numberToId.get(h.accountNumber)!,
          name: h.name,
          itemType: h.itemType,
          currentBalance: h.currentBalance,
          costBasis: h.costBasis ?? null,
          fairMarketValue: h.fairMarketValue ?? null,
          counterparty: h.counterparty ?? null,
          interestRate: h.interestRate ?? null,
          maturityDate: h.maturityDate ? new Date(h.maturityDate) : null,
        },
      });
      holdingMap.set(h.name, item.id);
      if (h.itemType === "BANK_ACCOUNT") {
        bankItemId = item.id;
      }
    }

    // ─── Positions ────────────────────────────────────────────
    console.log(`  📈 Creating positions...`);

    for (const p of positionDefs) {
      const subledgerItemId = holdingMap.get(p.holdingName)!;
      const computedCostBasis = p.costBasis ?? (p.quantity && p.unitCost ? p.quantity * p.unitCost : null);
      const computedMarketValue = p.marketValue ?? (p.quantity && p.unitPrice ? p.quantity * p.unitPrice : 0);

      await prisma.position.create({
        data: {
          subledgerItemId,
          name: p.name,
          positionType: p.positionType,
          quantity: p.quantity ?? null,
          unitCost: p.unitCost ?? null,
          unitPrice: p.unitPrice ?? null,
          costBasis: computedCostBasis,
          marketValue: computedMarketValue,
          ticker: p.ticker ?? null,
          assetClass: p.assetClass ?? null,
        },
      });
    }

    // ─── Bank Reconciliations ─────────────────────────────────
    if (bankItemId) {
      console.log(`  🏦 Creating bank reconciliations...`);

      // January reconciliation
      await prisma.bankReconciliation.create({
        data: {
          subledgerItemId: bankItemId,
          statementDate: new Date("2026-01-31"),
          statementBalance: cashBalancesByMonth.jan,
          glBalance: cashBalancesByMonth.jan,
          difference: 0,
          status: "COMPLETED",
          reconciledBy: CLERK_USER_ID,
          reconciledAt: new Date("2026-02-05"),
        },
      });

      // February reconciliation
      await prisma.bankReconciliation.create({
        data: {
          subledgerItemId: bankItemId,
          statementDate: new Date("2026-02-28"),
          statementBalance: cashBalancesByMonth.feb,
          glBalance: cashBalancesByMonth.feb,
          difference: 0,
          status: "COMPLETED",
          reconciledBy: CLERK_USER_ID,
          reconciledAt: new Date("2026-03-05"),
        },
      });
    }

    // ─── JE Templates ─────────────────────────────────────────
    console.log(`  📋 Creating JE template...`);

    interface TemplateDef {
      name: string;
      lines: { accountNumber: string; debit: number; credit: number; memo?: string }[];
      frequency: string;
      nextRunDate: string;
      lastRunDate: string;
    }

    let templateDef: TemplateDef;

    if (entityDef.name === "Blue Paw, LLC") {
      templateDef = {
        name: "Monthly Management Fee",
        lines: [
          { accountNumber: "10100", debit: 25000, credit: 0, memo: "Cash receipt" },
          { accountNumber: "40100", debit: 0, credit: 25000, memo: "Management fee income" },
        ],
        frequency: "monthly",
        nextRunDate: "2026-04-15",
        lastRunDate: "2026-03-15",
      };
    } else if (entityDef.name === "The Better Company, Inc.") {
      templateDef = {
        name: "Monthly Office Lease",
        lines: [
          { accountNumber: "50500", debit: 4500, credit: 0, memo: "Office lease payment" },
          { accountNumber: "10100", debit: 0, credit: 4500, memo: "Cash payment" },
        ],
        frequency: "monthly",
        nextRunDate: "2026-04-01",
        lastRunDate: "2026-03-31",
      };
    } else {
      templateDef = {
        name: "Monthly Trust Distribution",
        lines: [
          { accountNumber: "30300", debit: 15000, credit: 0, memo: "Beneficiary distribution" },
          { accountNumber: "10100", debit: 0, credit: 15000, memo: "Cash disbursement" },
        ],
        frequency: "monthly",
        nextRunDate: "2026-04-10",
        lastRunDate: "2026-03-10",
      };
    }

    const template = await prisma.journalEntryTemplate.create({
      data: {
        entityId: entity.id,
        name: templateDef.name,
        createdBy: CLERK_USER_ID,
        isRecurring: true,
        frequency: templateDef.frequency,
        nextRunDate: new Date(templateDef.nextRunDate),
        lastRunDate: new Date(templateDef.lastRunDate),
      },
    });

    for (let i = 0; i < templateDef.lines.length; i++) {
      const line = templateDef.lines[i];
      await prisma.journalEntryTemplateLine.create({
        data: {
          templateId: template.id,
          accountId: numberToId.get(line.accountNumber)!,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo ?? null,
          sortOrder: i,
        },
      });
    }

    console.log(`  ✅ ${entityDef.name} complete: ${COA.length} accounts, ${transactions.length} JEs, ${holdingDefs.length} holdings, ${positionDefs.length} positions`);
  }

  // Re-apply triggers
  console.log("\n🔒 Re-applying database triggers...");
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_posted_je_immutable
    BEFORE UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION prevent_posted_je_modification();
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_posted_line_immutable
    BEFORE INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION prevent_posted_line_modification();
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_validate_je_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_entry_lines
    FOR EACH ROW EXECUTE FUNCTION validate_je_balance();
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER trg_check_closed_period
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION check_closed_period();
  `);

  console.log("\n🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
