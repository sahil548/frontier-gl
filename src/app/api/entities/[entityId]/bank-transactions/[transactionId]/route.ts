import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { splitTransactionSchema } from "@/validators/bank-transaction";
import { createJournalEntryFromTransaction } from "@/lib/bank-transactions/create-je";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { postJournalEntryInTx } from "@/lib/journal-entries/post";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

// ---- Serialization Helpers ------------------------------------------------

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

// ---- Validation Schemas ---------------------------------------------------

const categorizeSchema = z.object({
  accountId: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  dimensionTags: z.record(z.string(), z.string()).optional(),
}).refine((d) => d.accountId || d.positionId, {
  message: "Either accountId or positionId is required",
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

  // Resolve accountId: either directly provided or resolved from positionId
  let resolvedAccountId = parsed.data.accountId ?? null;
  let resolvedPositionId = parsed.data.positionId ?? null;

  if (parsed.data.positionId) {
    const position = await prisma.position.findFirst({
      where: {
        id: parsed.data.positionId,
        subledgerItem: { entityId, isActive: true },
        isActive: true,
      },
      include: { subledgerItem: { select: { accountId: true } } },
    });
    if (!position) {
      return errorResponse("Position not found or does not belong to this entity", 400);
    }
    // Resolve GL account at apply-time from position
    resolvedAccountId = resolvedAccountId || position.accountId || position.subledgerItem.accountId;
    resolvedPositionId = position.id;
  }

  // Verify resolved account belongs to this entity
  if (resolvedAccountId) {
    const account = await prisma.account.findFirst({
      where: { id: resolvedAccountId, entityId, isActive: true },
      select: { id: true, number: true, name: true },
    });
    if (!account) {
      return errorResponse("Account not found or does not belong to this entity", 400);
    }
  }

  const updated = await prisma.bankTransaction.update({
    where: { id: transactionId },
    data: {
      accountId: resolvedAccountId,
      positionId: resolvedPositionId,
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
    positionId: updated.positionId,
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
      subledgerItem: {
        select: {
          accountId: true,
          positions: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { accountId: true },
          },
        },
      },
    },
  });

  if (!transaction) {
    return errorResponse("Transaction not found", 404);
  }

  if (transaction.status === "POSTED") {
    return errorResponse("Transaction is already posted", 400);
  }

  // For non-split, resolve accountId from positionId if needed
  let offsetAccountId = transaction.accountId;
  if (!offsetAccountId && transaction.positionId) {
    const position = await prisma.position.findUnique({
      where: { id: transaction.positionId },
      include: { subledgerItem: { select: { accountId: true } } },
    });
    if (position) {
      offsetAccountId = position.accountId ?? position.subledgerItem.accountId;
    }
  }

  if (!splits && !offsetAccountId) {
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

  // Resolve position-level GL account (leaf) if available, fall back to holding summary
  const defaultPosition = transaction.subledgerItem.positions?.[0];
  const bankAccountId = defaultPosition?.accountId ?? transaction.subledgerItem.accountId;

  try {
    // Build the JE input using our library function
    // Use resolved offset accountId (from position or direct assignment)
    const jeInput = createJournalEntryFromTransaction({
      transaction: {
        id: transaction.id,
        date: transaction.date,
        description: transaction.description,
        amount: Number(transaction.amount),
        accountId: offsetAccountId,
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

      // Step 1: Create the journal entry with line items.
      // Always created as DRAFT — postJournalEntryInTx flips status to POSTED
      // and stamps postedBy/postedAt when postImmediately is true. This keeps
      // the canonical post body (balance upserts + POSTED audit + status flip)
      // in one place (src/lib/journal-entries/post.ts) per Phase 14-01.
      const je = await tx.journalEntry.create({
        data: {
          entityId,
          entryNumber,
          date: jeInput.date,
          description: jeInput.description,
          status: "DRAFT",
          createdBy: userId,
          // postedBy/postedAt intentionally omitted — postJournalEntryInTx sets them.
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

      // Step 2: CREATED audit (bank-tx-specific). Runs BEFORE any post call so
      // audit ordering is the conventional CREATED → POSTED.
      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "CREATED",
          userId,
        },
      });

      // Step 3: Post immediately if requested. Delegates AccountBalance upsert
      // and POSTED audit to the canonical postJournalEntry logic (Phase 14-01).
      // Period-close trigger errors propagate from here and are caught below.
      if (postImmediately) {
        await postJournalEntryInTx(tx, je.id, userId);
      }

      // Step 4: Update the bank transaction status and link the JE.
      // Atomicity preserved: any failure above rolls back this update too.
      await tx.bankTransaction.update({
        where: { id: transactionId },
        data: {
          status: "POSTED",
          reconciliationStatus: "RECONCILED",
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
        // The local `result` object is the snapshot returned by tx.journalEntry.create
        // before postJournalEntryInTx ran — it still reads "DRAFT". Reflect the
        // post-transaction reality so the API response matches the persisted row.
        status: postImmediately ? "POSTED" : result.status,
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
