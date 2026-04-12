import {
  HOLDING_TYPE_TO_GL,
  DEFAULT_POSITION_NAME,
  DEFAULT_POSITION_TYPE,
} from "@/lib/holdings/constants";
import {
  createPositionGLAccount,
  createHoldingSummaryAccount,
} from "@/lib/holdings/position-gl";

/**
 * Result object returned by the migration function.
 */
export interface MigrationResult {
  migrated: number;
  defaultPositionsCreated: number;
  withExistingPositions: number;
  skipped: number;
}

/**
 * Shape of a holding fetched for migration (SubledgerItem with account and positions).
 */
interface HoldingForMigration {
  id: string;
  entityId: string;
  accountId: string;
  name: string;
  itemType: string;
  isActive: boolean;
  account: { id: string; number: string; parentId: string | null };
  positions: Array<{
    id: string;
    name: string;
    accountId: string | null;
    isActive: boolean;
  }>;
}

/**
 * Migrates existing holdings to the position model.
 *
 * For each unmigrated holding:
 * 1. Creates a new summary GL account under the type parent
 * 2. If holding has NO positions: re-parents existing GL account, creates default position
 * 3. If holding HAS positions: creates GL leaf account for each position
 * 4. Updates the holding's accountId to point to the new summary account
 *
 * The function is idempotent: re-running skips already-migrated holdings.
 * Detection: if any active position has an accountId set, the holding is already migrated.
 *
 * @param tx - Prisma client or transaction client
 * @returns Migration statistics
 */
export async function migrateHoldingsToPositionModel(
  tx: any
): Promise<MigrationResult> {
  // Fetch all active holdings with their account and positions
  const holdings: HoldingForMigration[] = await tx.subledgerItem.findMany({
    where: { isActive: true },
    include: {
      account: { select: { id: true, number: true, parentId: true } },
      positions: { where: { isActive: true }, select: { id: true, name: true, accountId: true, isActive: true } },
    },
  });

  let migrated = 0;
  let defaultPositionsCreated = 0;
  let withExistingPositions = 0;
  let skipped = 0;

  for (const holding of holdings) {
    // Idempotency check: if any position has accountId set, this holding is already migrated
    const alreadyMigrated = holding.positions.some(
      (p) => p.accountId !== null && p.accountId !== undefined
    );
    if (alreadyMigrated) {
      skipped++;
      continue;
    }

    // Look up GL mapping for this holding type
    const glMapping = HOLDING_TYPE_TO_GL[holding.itemType];
    if (!glMapping) {
      console.warn(
        `Unknown holding type "${holding.itemType}" for holding "${holding.name}" (${holding.id}), skipping`
      );
      skipped++;
      continue;
    }

    // 1. Create summary GL account under the type parent
    const summaryAccount = await createHoldingSummaryAccount(
      tx,
      holding.entityId,
      glMapping.parentPrefix,
      holding.name,
      glMapping.accountType
    );

    if (holding.positions.length === 0) {
      // 2a. No positions: re-parent existing GL account, create default position

      // Re-parent existing GL account under the new summary account
      await tx.account.update({
        where: { id: holding.account.id },
        data: { parentId: summaryAccount.id },
      });

      // Determine default position name and type
      const positionName =
        DEFAULT_POSITION_NAME[holding.itemType] || "General";
      const positionType =
        DEFAULT_POSITION_TYPE[holding.itemType] || "OTHER";

      // Create default position pointing to the existing (now re-parented) GL account
      await tx.position.create({
        data: {
          subledgerItemId: holding.id,
          name: positionName,
          positionType: positionType,
          accountId: holding.account.id,
          marketValue: 0,
        },
      });

      defaultPositionsCreated++;
    } else {
      // 2b. Has positions: create GL leaf account for each position

      for (const position of holding.positions) {
        const leafAccount = await createPositionGLAccount(
          tx,
          holding.entityId,
          summaryAccount.id,
          position.name,
          glMapping.accountType
        );

        // Update position's accountId to the newly created leaf account
        await tx.position.update({
          where: { id: position.id },
          data: { accountId: leafAccount.id },
        });
      }

      // Re-parent existing GL account under the new summary account
      await tx.account.update({
        where: { id: holding.account.id },
        data: { parentId: summaryAccount.id },
      });

      withExistingPositions++;
    }

    // 3. Update the holding's accountId to the new summary account
    await tx.subledgerItem.update({
      where: { id: holding.id },
      data: { accountId: summaryAccount.id },
    });

    migrated++;
  }

  return { migrated, defaultPositionsCreated, withExistingPositions, skipped };
}
