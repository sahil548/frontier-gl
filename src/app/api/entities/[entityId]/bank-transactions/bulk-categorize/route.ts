import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { bulkCategorizeSchema } from "@/validators/bank-transaction";
import { createJournalEntryFromTransaction } from "@/lib/bank-transactions/create-je";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { Prisma } from "@/generated/prisma/client";

/**
 * POST /api/entities/:entityId/bank-transactions/bulk-categorize
 *
 * Bulk assign account + optionally post selected transactions as JEs.
 * Wraps all operations in a Prisma transaction for atomicity.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
  });
  if (!access) return errorResponse("Entity not found", 403);
  if (access.role === "VIEWER") {
    return errorResponse("Insufficient permissions", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const parsed = bulkCategorizeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  const { transactionIds, accountId, postImmediately } = parsed.data;

  // Verify account belongs to this entity
  const account = await prisma.account.findFirst({
    where: { id: accountId, entityId, isActive: true },
    select: { id: true },
  });

  if (!account) {
    return errorResponse("Account not found or does not belong to this entity", 400);
  }

  // Fetch all specified transactions scoped to this entity
  const transactions = await prisma.bankTransaction.findMany({
    where: {
      id: { in: transactionIds },
      subledgerItem: { entityId },
      status: { not: "POSTED" }, // Skip already-posted transactions
    },
    include: {
      subledgerItem: { select: { accountId: true } },
    },
  });

  if (transactions.length === 0) {
    return errorResponse("No eligible transactions found", 400);
  }

  const errors: string[] = [];

  try {
    const result = await prisma.$transaction(async (tx) => {
      let processed = 0;
      let journalEntries = 0;

      for (const txn of transactions) {
        try {
          // Assign the account to the transaction
          if (postImmediately) {
            // Build JE input
            const jeInput = createJournalEntryFromTransaction({
              transaction: {
                id: txn.id,
                date: txn.date,
                description: txn.description,
                amount: Number(txn.amount),
                accountId: accountId,
              },
              bankAccountId: txn.subledgerItem.accountId,
              entityId,
              userId,
              postImmediately: true,
            });

            const entryNumber = await generateNextEntryNumber(tx, entityId);

            // Create the journal entry
            const je = await tx.journalEntry.create({
              data: {
                entityId,
                entryNumber,
                date: jeInput.date,
                description: jeInput.description,
                status: "POSTED",
                createdBy: userId,
                postedBy: userId,
                postedAt: new Date(),
                lineItems: {
                  create: jeInput.lineItems.map((li, idx) => ({
                    accountId: li.accountId,
                    debit: new Prisma.Decimal(String(li.debit)),
                    credit: new Prisma.Decimal(String(li.credit)),
                    memo: li.memo || null,
                    sortOrder: idx,
                  })),
                },
              },
              include: { lineItems: true },
            });

            // Update account balances
            for (const line of je.lineItems) {
              const debitAmount = new Prisma.Decimal(line.debit.toString());
              const creditAmount = new Prisma.Decimal(line.credit.toString());
              const balanceChange = debitAmount.minus(creditAmount);

              await tx.accountBalance.upsert({
                where: { accountId: line.accountId },
                create: {
                  accountId: line.accountId,
                  debitTotal: debitAmount,
                  creditTotal: creditAmount,
                  balance: balanceChange,
                },
                update: {
                  debitTotal: { increment: debitAmount },
                  creditTotal: { increment: creditAmount },
                  balance: { increment: balanceChange },
                },
              });
            }

            // Audit trails
            await tx.journalEntryAudit.createMany({
              data: [
                { journalEntryId: je.id, action: "CREATED", userId },
                { journalEntryId: je.id, action: "POSTED", userId },
              ],
            });

            // Update the bank transaction
            await tx.bankTransaction.update({
              where: { id: txn.id },
              data: {
                accountId,
                status: "POSTED",
                journalEntryId: je.id,
              },
            });

            journalEntries++;
          } else {
            // Just categorize without creating JE
            await tx.bankTransaction.update({
              where: { id: txn.id },
              data: {
                accountId,
                status: "CATEGORIZED",
              },
            });
          }

          processed++;
        } catch (err) {
          errors.push(
            `Transaction ${txn.id}: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      }

      return { processed, journalEntries };
    });

    return successResponse({
      processed: result.processed,
      journalEntries: result.journalEntries,
      errors,
    });
  } catch (err) {
    console.error("Bulk categorize error:", err);
    return errorResponse(
      `Bulk operation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }
}
