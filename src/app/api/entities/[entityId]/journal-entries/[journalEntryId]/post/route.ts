import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { postJournalEntry } from "@/lib/journal-entries/post";
import { Prisma } from "@/generated/prisma/client";

/**
 * POST /api/entities/:entityId/journal-entries/:journalEntryId/post
 *
 * Posts a journal entry, transitioning to POSTED status with atomic balance updates.
 * Delegates to postJournalEntry for business logic (status check, balance upserts, audit).
 */

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, journalEntryId } = await params;

  // Verify the JE belongs to this entity
  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
  });

  if (!je) {
    return errorResponse("Journal entry not found", 404);
  }

  try {
    await postJournalEntry(journalEntryId, userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to post entry";

    if (message.includes("already posted")) {
      return errorResponse("Journal entry is already posted", 400);
    }
    if (message.includes("closed period") || message.includes("period is closed")) {
      return errorResponse(
        "Cannot post to a closed period. Reopen the period first.",
        400
      );
    }
    return errorResponse(message, 500);
  }

  // Fetch the updated entry with line items for response
  const updated = await prisma.journalEntry.findUnique({
    where: { id: journalEntryId },
    include: {
      lineItems: {
        include: {
          account: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!updated) {
    return errorResponse("Failed to retrieve posted entry", 500);
  }

  return successResponse({
    id: updated.id,
    entityId: updated.entityId,
    entryNumber: updated.entryNumber,
    date: updated.date.toISOString(),
    description: updated.description,
    status: updated.status,
    createdBy: updated.createdBy,
    approvedBy: updated.approvedBy,
    postedBy: updated.postedBy,
    createdAt: updated.createdAt.toISOString(),
    approvedAt: updated.approvedAt?.toISOString() ?? null,
    postedAt: updated.postedAt?.toISOString() ?? null,
    updatedAt: updated.updatedAt.toISOString(),
    reversalOfId: updated.reversalOfId,
    lineItems: updated.lineItems.map((li) => ({
      id: li.id,
      accountId: li.accountId,
      debit: serializeDecimal(li.debit),
      credit: serializeDecimal(li.credit),
      memo: li.memo,
      sortOrder: li.sortOrder,
      account: li.account
        ? { id: li.account.id, number: li.account.number, name: li.account.name, type: li.account.type }
        : undefined,
    })),
  });
}
