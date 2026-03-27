import { prisma } from "@/lib/db/prisma";
import { generateNextEntryNumber } from "./auto-number";

/**
 * Creates a reversal draft for a posted journal entry.
 *
 * The reversal entry has all line items flipped (debits become credits,
 * credits become debits) and is linked to the original via reversalOfId.
 *
 * @param journalEntryId - The posted journal entry to reverse
 * @param userId - The Clerk user ID performing the action
 * @returns The newly created reversal draft with line items
 * @throws Error if the original entry is not posted
 */
export async function createReversalDraft(
  journalEntryId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.journalEntry.findUniqueOrThrow({
      where: { id: journalEntryId },
      include: { lineItems: true },
    });

    if (original.status !== "POSTED") {
      throw new Error("Can only reverse posted entries");
    }

    // Generate next entry number
    const nextNumber = await generateNextEntryNumber(tx, original.entityId);

    const reversal = await tx.journalEntry.create({
      data: {
        entityId: original.entityId,
        entryNumber: nextNumber,
        date: new Date(),
        description: `Reversal of ${original.entryNumber}`,
        status: "DRAFT",
        createdBy: userId,
        reversalOfId: original.id,
        lineItems: {
          create: original.lineItems.map((line, index) => ({
            accountId: line.accountId,
            debit: line.credit, // Flip: original credit becomes debit
            credit: line.debit, // Flip: original debit becomes credit
            memo: `Reversal: ${line.memo || ""}`,
            sortOrder: index,
          })),
        },
      },
      include: { lineItems: true },
    });

    // Record audit trail on original
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId: original.id,
        action: "REVERSAL_CREATED",
        userId,
        changes: { reversalId: reversal.id },
      },
    });

    return reversal;
  });
}
