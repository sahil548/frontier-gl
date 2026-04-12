#!/usr/bin/env npx tsx --tsconfig ../tsconfig.json
/**
 * Data migration script: Migrate existing holdings to the position model.
 *
 * Usage:
 *   npx tsx scripts/migrate-holdings-positions.ts           # Run migration
 *   npx tsx scripts/migrate-holdings-positions.ts --dry-run  # Preview changes without writing
 *
 * This script:
 * - Creates summary GL accounts for all unmigrated holdings
 * - Creates default positions for holdings without positions
 * - Creates GL leaf accounts for holdings with existing positions
 * - Re-parents existing GL accounts under the new summary accounts
 * - Is idempotent: safe to re-run
 *
 * @see src/scripts/migrate-holdings-positions.ts for the library function (unit-testable)
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Relative imports since this file is outside src/ (tsx resolves these at runtime)
const { PrismaClient } = require("../src/generated/prisma/client") as {
  PrismaClient: new () => any;
};

const HOLDING_TYPE_TO_GL: Record<string, { parentPrefix: string; accountType: string }> = {
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
  INVESTMENT: { parentPrefix: "12000", accountType: "ASSET" },
  PRIVATE_EQUITY: { parentPrefix: "13000", accountType: "ASSET" },
  RECEIVABLE: { parentPrefix: "14000", accountType: "ASSET" },
};

const DEFAULT_POSITION_NAME: Record<string, string> = {
  BANK_ACCOUNT: "Cash", BROKERAGE_ACCOUNT: "Cash", CREDIT_CARD: "Balance",
  REAL_ESTATE: "Property", EQUIPMENT: "Equipment", LOAN: "Principal",
  PRIVATE_FUND: "LP Interest", MORTGAGE: "Principal", LINE_OF_CREDIT: "Balance",
  TRUST_ACCOUNT: "Corpus", OPERATING_BUSINESS: "Equity Interest",
  NOTES_RECEIVABLE: "Note", OTHER: "General",
  INVESTMENT: "Cash", PRIVATE_EQUITY: "LP Interest", RECEIVABLE: "Note",
};

const DEFAULT_POSITION_TYPE: Record<string, string> = {
  BANK_ACCOUNT: "CASH", BROKERAGE_ACCOUNT: "CASH", CREDIT_CARD: "CASH",
  TRUST_ACCOUNT: "CASH", REAL_ESTATE: "REAL_PROPERTY", EQUIPMENT: "OTHER",
  LOAN: "OTHER", MORTGAGE: "OTHER", LINE_OF_CREDIT: "OTHER",
  PRIVATE_FUND: "PRIVATE_EQUITY", OPERATING_BUSINESS: "OTHER",
  NOTES_RECEIVABLE: "OTHER", OTHER: "OTHER",
  INVESTMENT: "CASH", PRIVATE_EQUITY: "PRIVATE_EQUITY", RECEIVABLE: "OTHER",
};

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(
    isDryRun
      ? "[DRY RUN] Previewing holdings migration..."
      : "Starting holdings-to-positions migration..."
  );

  const holdings = await prisma.subledgerItem.findMany({
    where: { isActive: true },
    include: {
      account: { select: { id: true, number: true, parentId: true } },
      positions: {
        where: { isActive: true },
        select: { id: true, name: true, accountId: true, isActive: true },
      },
    },
  });

  console.log(`Found ${holdings.length} active holdings`);

  let migrated = 0;
  let defaultPositionsCreated = 0;
  let withExistingPositions = 0;
  let skipped = 0;

  for (const holding of holdings) {
    const alreadyMigrated = holding.positions.some(
      (p: any) => p.accountId !== null && p.accountId !== undefined
    );
    if (alreadyMigrated) {
      console.log(`  SKIP: "${holding.name}" (already migrated)`);
      skipped++;
      continue;
    }

    const glMapping = HOLDING_TYPE_TO_GL[holding.itemType];
    if (!glMapping) {
      console.warn(`  SKIP: "${holding.name}" -- unknown type "${holding.itemType}"`);
      skipped++;
      continue;
    }

    if (isDryRun) {
      const posCount = holding.positions.length;
      const action =
        posCount === 0
          ? `create default position "${DEFAULT_POSITION_NAME[holding.itemType] || "General"}"`
          : `create ${posCount} GL leaf account(s)`;
      console.log(
        `  WOULD MIGRATE: "${holding.name}" (${holding.itemType}) -- ${action}, summary under ${glMapping.parentPrefix}`
      );
      migrated++;
      if (posCount === 0) defaultPositionsCreated++;
      else withExistingPositions++;
      continue;
    }

    await prisma.$transaction(async (tx: any) => {
      const parentAccount = await tx.account.findFirst({
        where: { entityId: holding.entityId, number: glMapping.parentPrefix, isActive: true },
        select: { id: true, number: true },
      });

      if (!parentAccount) {
        console.warn(`  SKIP: "${holding.name}" -- GL parent ${glMapping.parentPrefix} not found`);
        skipped++;
        return;
      }

      const siblings = await tx.account.findMany({
        where: { entityId: holding.entityId, parentId: parentAccount.id },
        orderBy: { number: "desc" },
        take: 1,
      });

      const parentNum = parseInt(parentAccount.number, 10);
      const summaryNumber =
        siblings.length === 0
          ? (parentNum + 100).toString()
          : (parseInt(siblings[0].number, 10) + 100).toString();

      const summaryAccount = await tx.account.create({
        data: {
          entityId: holding.entityId,
          number: summaryNumber,
          name: holding.name,
          type: glMapping.accountType,
          parentId: parentAccount.id,
        },
      });

      await tx.accountBalance.create({ data: { accountId: summaryAccount.id, balance: 0 } });

      if (holding.positions.length === 0) {
        await tx.account.update({
          where: { id: holding.account.id },
          data: { parentId: summaryAccount.id },
        });

        const posName = DEFAULT_POSITION_NAME[holding.itemType] || "General";
        const posType = DEFAULT_POSITION_TYPE[holding.itemType] || "OTHER";

        await tx.position.create({
          data: {
            subledgerItemId: holding.id,
            name: posName,
            positionType: posType,
            accountId: holding.account.id,
            marketValue: 0,
          },
        });

        defaultPositionsCreated++;
        console.log(`  MIGRATED: "${holding.name}" -- default position "${posName}" created`);
      } else {
        for (const pos of holding.positions) {
          const posSiblings = await tx.account.findMany({
            where: { entityId: holding.entityId, parentId: summaryAccount.id },
            orderBy: { number: "desc" },
            take: 1,
          });

          const summaryNum = parseInt(summaryAccount.number, 10);
          const leafNumber =
            posSiblings.length === 0
              ? (summaryNum + 10).toString()
              : (parseInt(posSiblings[0].number, 10) + 10).toString();

          const leafAccount = await tx.account.create({
            data: {
              entityId: holding.entityId,
              number: leafNumber,
              name: pos.name,
              type: glMapping.accountType,
              parentId: summaryAccount.id,
            },
          });

          await tx.accountBalance.create({ data: { accountId: leafAccount.id, balance: 0 } });

          await tx.position.update({
            where: { id: pos.id },
            data: { accountId: leafAccount.id },
          });
        }

        await tx.account.update({
          where: { id: holding.account.id },
          data: { parentId: summaryAccount.id },
        });

        withExistingPositions++;
        console.log(
          `  MIGRATED: "${holding.name}" -- ${holding.positions.length} position GL account(s) created`
        );
      }

      await tx.subledgerItem.update({
        where: { id: holding.id },
        data: { accountId: summaryAccount.id },
      });

      migrated++;
    });
  }

  console.log("\n--- Migration Summary ---");
  console.log(`Migrated: ${migrated}`);
  console.log(`  With default positions created: ${defaultPositionsCreated}`);
  console.log(`  With existing positions: ${withExistingPositions}`);
  console.log(`Skipped: ${skipped}`);

  if (isDryRun) {
    console.log("\n[DRY RUN] No changes were written to the database.");
  }
}

main()
  .catch((err: Error) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
