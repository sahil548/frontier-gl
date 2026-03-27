/**
 * Generates the next journal entry number for an entity.
 *
 * Format: JE-001, JE-042, JE-1337 (padded to 3 digits minimum, grows naturally beyond)
 *
 * @param tx - Prisma transaction client
 * @param entityId - The entity to generate the number for
 * @returns Next entry number string (e.g., "JE-001")
 */
export async function generateNextEntryNumber(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: { journalEntry: { findFirst: (...args: any[]) => Promise<{ entryNumber: string } | null> } },
  entityId: string
): Promise<string> {
  const lastEntry = await tx.journalEntry.findFirst({
    where: { entityId },
    orderBy: { entryNumber: "desc" },
    select: { entryNumber: true },
  });

  if (!lastEntry) {
    return "JE-001";
  }

  // Extract numeric part from "JE-XXX" format
  const match = lastEntry.entryNumber.match(/^JE-(\d+)$/);
  if (!match) {
    return "JE-001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  const padded = nextNum.toString().padStart(3, "0");
  return `JE-${padded}`;
}
