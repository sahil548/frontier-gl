import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Posts a journal entry, atomically updating account balances.
 *
 * Within an interactive transaction:
 * 1. Verifies the entry exists and is not already POSTED
 * 2. Updates status to POSTED with audit fields
 * 3. Upserts AccountBalance for each line item using atomic increment
 * 4. Creates audit trail entry
 *
 * @param journalEntryId - The journal entry to post
 * @param userId - The Clerk user ID performing the action
 * @throws Error if entry is already posted
 */
export async function postJournalEntry(
  journalEntryId: string,
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. Lock the journal entry and verify it's postable
    const je = await tx.journalEntry.findUniqueOrThrow({
      where: { id: journalEntryId },
      include: { lineItems: true },
    });

    if (je.status === "POSTED") {
      throw new Error("Journal entry is already posted");
    }

    // 2. Update status to POSTED
    await tx.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: "POSTED",
        postedBy: userId,
        postedAt: new Date(),
      },
    });

    // 3. Update account balances atomically
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

    // 4. Record audit trail
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId,
        action: "POSTED",
        userId,
      },
    });
  });
}
