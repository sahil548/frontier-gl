import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { createReversalDraft } from "@/lib/journal-entries/reverse";
import { Prisma } from "@/generated/prisma/client";

/**
 * POST /api/entities/:entityId/journal-entries/:journalEntryId/reverse
 *
 * Creates a reversal draft for a posted journal entry.
 * The reversal has all line items flipped (debits become credits, vice versa)
 * and is linked to the original via reversalOfId.
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
    const reversal = await createReversalDraft(journalEntryId, userId);

    return successResponse(
      {
        id: reversal.id,
        entityId: reversal.entityId,
        entryNumber: reversal.entryNumber,
        date: reversal.date.toISOString(),
        description: reversal.description,
        status: reversal.status,
        createdBy: reversal.createdBy,
        createdAt: reversal.createdAt.toISOString(),
        reversalOfId: reversal.reversalOfId,
        lineItems: reversal.lineItems.map((li) => ({
          id: li.id,
          accountId: li.accountId,
          debit: serializeDecimal(li.debit),
          credit: serializeDecimal(li.credit),
          memo: li.memo,
          sortOrder: li.sortOrder,
        })),
      },
      201
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create reversal";

    if (message.includes("only reverse posted")) {
      return errorResponse("Can only reverse posted entries", 400);
    }
    return errorResponse(message, 500);
  }
}
