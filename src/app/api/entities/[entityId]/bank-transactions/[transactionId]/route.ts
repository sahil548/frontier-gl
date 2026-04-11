import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { splitTransactionSchema } from "@/validators/bank-transaction";
import { createJournalEntryFromTransaction } from "@/lib/bank-transactions/create-je";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ---- Serialization Helpers ------------------------------------------------

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

// ---- Validation Schemas ---------------------------------------------------

const categorizeSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  dimensionTags: z.record(z.string(), z.string()).optional(),
});

const postTransactionSchema = z.object({
  postImmediately: z.boolean().optional().default(true),
  splits: splitTransactionSchema.shape.lines.optional(),
});

// ---- PATCH: Categorize single transaction ---------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string; transactionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, transactionId } = await params;

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

  const parsed = categorizeSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  // Verify transaction belongs to this entity
  const transaction = await prisma.bankTransaction.findFirst({
    where: {
      id: transactionId,
      subledgerItem: { entityId },
    },
  });

  if (!transaction) {
    return errorResponse("Transaction not found", 404);
  }

  // Verify account belongs to this entity
  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, entityId, isActive: true },
    select: { id: true, number: true, name: true },
  });

  if (!account) {
    return errorResponse("Account not found or does not belong to this entity", 400);
  }

  const updated = await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: {
      accountId: parsed.data.accountId,
      status: "CATEGORIZED",
    },
    include: {
      account: { select: { id: true, number: true, name: true } },
      rule: { select: { id: true, pattern: true } },
    },
  });

  return successResponse({
    id: updated.id,
    subledgerItemId: updated.subledgerItemId,
    date: updated.date.toISOString(),
    description: updated.description,
    amount: serializeDecimal(updated.amount),
    status: updated.status,
    accountId: updated.accountId,
    account: updated.account
      ? { id: updated.account.id, number: updated.account.number, name: updated.account.name }
      : null,
  });
}

// ---- POST: Create JE from transaction -------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string; transactionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, transactionId } = await params;

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

  const parsed = postTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 400, parsed.error);
  }

  const { postImmediately, splits } = parsed.data;

  // Fetch transaction with subledger item to get the bank account GL accountId
  const transaction = await prisma.bankTransaction.findFirst({
    where: {
      id: transactionId,
      subledgerItem: { entityId },
    },
    include: {
      subledgerItem: { select: { accountId: true } },
    },
  });

  if (!transaction) {
    return errorResponse("Transaction not found", 404);
  }

  if (transaction.status === "POSTED") {
    return errorResponse("Transaction is already posted", 400);
  }

  // For non-split, transaction must have an accountId assigned
  if (!splits && !transaction.accountId) {
    return errorResponse(
      "Transaction must be categorized (have an account assigned) before posting",
      400
    );
  }

  // Validate split amounts sum to the transaction absolute amount
  const absAmount = Math.abs(Number(transaction.amount));
  if (splits && splits.length > 0) {
    const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitSum - absAmount) > 0.005) {
      return errorResponse(
        `Split amounts sum to ${splitSum.toFixed(2)} but transaction amount is ${absAmount.toFixed(2)}`,
        400
      );
    }
  }

  const bankAccountId = transaction.subledgerItem.accountId;

  try {
    // Build the JE input using our library function
    const jeInput = createJournalEntryFromTransaction({
      transaction: {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: Number(transaction.amount),
        accountId: transaction.accountId,
      },
      bankAccountId,
      entityId,
      userId,
      splits,
      postImmediately,
    });

    // Create JE and update transaction in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      const entryNumber = await generateNextEntryNumber(tx, entityId);

      // Create the journal entry with line items
      const je = await tx.journalEntry.create({
        data: {
          entityId,
          entryNumber,
          date: jeInput.date,
          description: jeInput.description,
          status: jeInput.status,
          createdBy: userId,
          postedBy: jeInput.postedBy || null,
          postedAt: jeInput.postedAt || null,
          lineItems: {
            create: jeInput.lineItems.map((li, index) => ({
              accountId: li.accountId,
              debit: new Prisma.Decimal(String(li.debit)),
              credit: new Prisma.Decimal(String(li.credit)),
              memo: li.memo || null,
              sortOrder: index,
            })),
          },
        },
        include: {
          lineItems: {
            include: {
              account: { select: { id: true, number: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      // If posting immediately, update account balances
      if (postImmediately) {
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

        // Audit trail
        await tx.journalEntryAudit.create({
          data: {
            journalEntryId: je.id,
            action: "POSTED",
            userId,
          },
        });
      }

      // Audit trail for creation
      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "CREATED",
          userId,
        },
      });

      // Update the bank transaction status and link the JE
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: {
          status: "POSTED",
          journalEntryId: je.id,
          isSplit: splits !== undefined && splits.length > 0,
          // If splits provided, also set accountId to null (multiple accounts via JE lines)
          ...(splits && splits.length > 0 ? { accountId: null } : {}),
        },
      });

      return je;
    });

    return successResponse(
      {
        id: result.id,
        entryNumber: result.entryNumber,
        date: result.date.toISOString(),
        description: result.description,
        status: result.status,
        lineItems: result.lineItems.map((li) => ({
          id: li.id,
          accountId: li.accountId,
          debit: serializeDecimal(li.debit),
          credit: serializeDecimal(li.credit),
          memo: li.memo,
          account: li.account,
        })),
      },
      201
    );
  } catch (err) {
    console.error("Bank transaction JE create error:", err);
    return errorResponse(
      `Failed to create journal entry: ${err instanceof Error ? err.message : "Unknown error"}`,
      500
    );
  }
}
