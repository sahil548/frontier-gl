import type {
  Transaction,
  RemovedTransaction,
} from "plaid";
import { plaidClient } from "./client";
import { decryptToken } from "./encrypt";

export interface SyncResult {
  added: number;
  modified: number;
  removed: number;
}

interface PlaidConnectionInput {
  id: string;
  subledgerItemId: string;
  accessToken: string;
  syncCursor: string | null;
}

/**
 * Sync transactions from Plaid using cursor-based transactionsSync API.
 *
 * CRITICAL: Collects ALL pages before persisting (Plaid best practice).
 * On TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION, restarts from original cursor.
 */
export async function syncTransactions(
  connection: PlaidConnectionInput
): Promise<SyncResult> {
  const { prisma } = await import("@/lib/db/prisma");
  const { matchRule } = await import("@/lib/bank-transactions/categorize");

  const accessToken = decryptToken(connection.accessToken);
  const originalCursor = connection.syncCursor;

  let cursor = originalCursor;
  let allAdded: Transaction[] = [];
  let allModified: Transaction[] = [];
  let allRemoved: RemovedTransaction[] = [];

  // Collect all pages before persisting
  let retry = true;
  while (retry) {
    retry = false;
    allAdded = [];
    allModified = [];
    allRemoved = [];
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          cursor: cursor || undefined,
          count: 500,
        });

        allAdded = allAdded.concat(response.data.added);
        allModified = allModified.concat(response.data.modified);
        allRemoved = allRemoved.concat(response.data.removed);
        hasMore = response.data.has_more;
        cursor = response.data.next_cursor;
      } catch (error: unknown) {
        const plaidError = error as { response?: { data?: { error_code?: string } } };
        const errorCode = plaidError?.response?.data?.error_code;

        if (errorCode === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") {
          // Restart loop from original cursor
          cursor = originalCursor;
          retry = true;
          break;
        }

        if (errorCode === "ITEM_LOGIN_REQUIRED") {
          // Set connection to ERROR status
          await prisma.plaidConnection.update({
            where: { id: connection.id },
            data: {
              status: "ERROR",
              error: "Bank requires re-authentication",
            },
          });
          return { added: 0, modified: 0, removed: 0 };
        }

        throw error;
      }
    }
  }

  // Fetch categorization rules for auto-apply
  const subledgerItem = await prisma.subledgerItem.findUnique({
    where: { id: connection.subledgerItemId },
    select: { entityId: true },
  });

  let rules: Array<{
    id: string;
    pattern: string;
    amountMin: unknown;
    amountMax: unknown;
    accountId: string;
    dimensionTags: unknown;
    isActive: boolean;
    priority: number;
  }> = [];

  if (subledgerItem) {
    rules = await prisma.categorizationRule.findMany({
      where: { entityId: subledgerItem.entityId, isActive: true },
      orderBy: { priority: "asc" },
    });
  }

  // Persist in a single transaction
  await prisma.$transaction(async (tx) => {
    // --- Added ---
    for (const txn of allAdded) {
      // Skip duplicates by externalId
      const existing = await tx.bankTransaction.findFirst({
        where: {
          subledgerItemId: connection.subledgerItemId,
          externalId: txn.transaction_id,
        },
      });
      if (existing) continue;

      // Plaid positive = outflow (expense), we want negative for outflow
      const amount = -(txn.amount ?? 0);

      // Auto-categorize
      let accountId: string | null = null;
      let ruleId: string | null = null;
      const matchedRule = matchRule(
        { description: txn.name || "", amount },
        rules as Parameters<typeof matchRule>[1]
      );
      if (matchedRule) {
        accountId = matchedRule.accountId;
        ruleId = matchedRule.id;
      }

      await tx.bankTransaction.create({
        data: {
          subledgerItemId: connection.subledgerItemId,
          externalId: txn.transaction_id,
          date: new Date(txn.date),
          description: txn.name || txn.merchant_name || "Unknown",
          amount,
          originalDescription: txn.original_description ?? null,
          merchantName: txn.merchant_name ?? null,
          category: txn.personal_finance_category?.primary ?? null,
          source: "PLAID",
          status: "PENDING",
          accountId,
          ruleId,
        },
      });
    }

    // --- Modified ---
    for (const txn of allModified) {
      const amount = -(txn.amount ?? 0);
      await tx.bankTransaction.updateMany({
        where: {
          subledgerItemId: connection.subledgerItemId,
          externalId: txn.transaction_id,
        },
        data: {
          description: txn.name || txn.merchant_name || "Unknown",
          amount,
          originalDescription: txn.original_description ?? null,
          merchantName: txn.merchant_name ?? null,
          category: txn.personal_finance_category?.primary ?? null,
        },
      });
    }

    // --- Removed (only PENDING) ---
    for (const txn of allRemoved) {
      await tx.bankTransaction.deleteMany({
        where: {
          subledgerItemId: connection.subledgerItemId,
          externalId: txn.transaction_id,
          status: "PENDING",
        },
      });
    }

    // Update cursor and lastSyncAt
    await tx.plaidConnection.update({
      where: { id: connection.id },
      data: {
        syncCursor: cursor,
        lastSyncAt: new Date(),
      },
    });
  });

  return {
    added: allAdded.length,
    modified: allModified.length,
    removed: allRemoved.length,
  };
}
