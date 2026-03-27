import { prisma } from "@/lib/db/prisma";

/**
 * Suggests the next available account number for an entity.
 *
 * Top-level accounts: increment by 10000 (10000, 20000, 30000, ...)
 * Sub-accounts: parentNumber + increment by 100 (10100, 10200, ...)
 *
 * @param entityId - The entity to suggest a number for
 * @param parentNumber - If provided, suggests a sub-account number under this parent
 * @returns Suggested account number string
 */
export async function suggestNextAccountNumber(
  entityId: string,
  parentNumber?: string
): Promise<string> {
  if (!parentNumber) {
    // Top-level account: find highest top-level number and add 10000
    const maxAccount = await prisma.account.findFirst({
      where: { entityId, parentId: null },
      orderBy: { number: "desc" },
    });

    if (!maxAccount) return "10000";

    const currentMax = parseInt(maxAccount.number, 10);
    const next = Math.ceil((currentMax + 10000) / 10000) * 10000;
    return next.toString();
  }

  // Sub-account: find siblings and suggest next in 100 increments
  const siblings = await prisma.account.findMany({
    where: {
      entityId,
      parent: { number: parentNumber },
    },
    orderBy: { number: "desc" },
    take: 1,
  });

  if (siblings.length === 0) {
    return (parseInt(parentNumber, 10) + 100).toString();
  }

  return (parseInt(siblings[0].number, 10) + 100).toString();
}
