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
 */

import { PrismaClient } from "../../src/generated/prisma/client";
import {
  HOLDING_TYPE_TO_GL,
  DEFAULT_POSITION_NAME,
  DEFAULT_POSITION_TYPE,
} from "../../src/lib/holdings/constants";

const prisma = new PrismaClient();

const isDryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(
    isDryRun
      ? "[DRY RUN] Previewing holdings migration..."
      : "Starting holdings-to-positions migration..."
  );

  // Fetch all active holdings with their account and positions
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
    // Idempotency: skip if any position already has accountId
    const alreadyMigrated = holding.positions.some(
      (p) => p.accountId !== null && p.accountId !== undefined
    );
    if (alreadyMigrated) {
      console.log(`  SKIP: "${holding.name}" (already migrated)`);
      skipped++;
      continue;
    }

    const glMapping = HOLDING_TYPE_TO_GL[holding.itemType];
    if (!glMapping) {
      console.warn(
        `  SKIP: "${holding.name}" -- unknown type "${holding.itemType}"`
      );
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

    // Run migration for this holding in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Create summary GL account
      const parentAccount = await tx.account.findFirst({
        where: {
          entityId: holding.entityId,
          number: glMapping.parentPrefix,
          isActive: true,
        },
        select: { id: true, number: true },
      });

      if (!parentAccount) {
        console.warn(
          `  SKIP: "${holding.name}" -- GL parent ${glMapping.parentPrefix} not found`
        );
        skipped++;
        return;
      }

      // Find highest sibling for +100 stepping
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

      await tx.accountBalance.create({
        data: { accountId: summaryAccount.id, balance: 0 },
      });

      if (holding.positions.length === 0) {
        // Re-parent existing GL account
        await tx.account.update({
          where: { id: holding.account.id },
          data: { parentId: summaryAccount.id },
        });

        // Create default position
        const posName =
          DEFAULT_POSITION_NAME[holding.itemType] || "General";
        const posType =
          DEFAULT_POSITION_TYPE[holding.itemType] || "OTHER";

        await tx.position.create({
          data: {
            subledgerItemId: holding.id,
            name: posName,
            positionType: posType as any,
            accountId: holding.account.id,
            marketValue: 0,
          },
        });

        defaultPositionsCreated++;
        console.log(
          `  MIGRATED: "${holding.name}" -- default position "${posName}" created`
        );
      } else {
        // Create GL leaf for each position
        for (const pos of holding.positions) {
          const posSiblings = await tx.account.findMany({
            where: {
              entityId: holding.entityId,
              parentId: summaryAccount.id,
            },
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

          await tx.accountBalance.create({
            data: { accountId: leafAccount.id, balance: 0 },
          });

          await tx.position.update({
            where: { id: pos.id },
            data: { accountId: leafAccount.id },
          });
        }

        // Re-parent existing GL account
        await tx.account.update({
          where: { id: holding.account.id },
          data: { parentId: summaryAccount.id },
        });

        withExistingPositions++;
        console.log(
          `  MIGRATED: "${holding.name}" -- ${holding.positions.length} position GL account(s) created`
        );
      }

      // Update holding's accountId to summary
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
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
