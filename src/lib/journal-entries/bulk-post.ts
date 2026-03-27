import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";

/**
 * Posts multiple journal entries in a single transaction.
 * All-or-nothing: if any entry fails, all are rolled back.
 *
 * @param journalEntryIds - Array of journal entry IDs to post
 * @param userId - The Clerk user ID performing the action
 * @returns Array of posted entry numbers
 * @throws Error if any entry is already posted or not found
 */
export async function bulkPostEntries(
  journalEntryIds: string[],
  userId: string
) {
  return prisma.$transaction(async (tx) => {
    const results: string[] = [];

    for (const id of journalEntryIds) {
      const je = await tx.journalEntry.findUniqueOrThrow({
        where: { id },
        include: { lineItems: true },
      });

      if (je.status === "POSTED") {
        throw new Error(`Entry ${je.entryNumber} is already posted`);
      }

      // Update status
      await tx.journalEntry.update({
        where: { id },
        data: {
          status: "POSTED",
          postedBy: userId,
          postedAt: new Date(),
        },
      });

      // Update balances for each line
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

      // Create audit entry
      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: id,
          action: "POSTED",
          userId,
        },
      });

      results.push(je.entryNumber);
    }

    return results;
  });
}
