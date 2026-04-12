import type { AccountType } from "@/generated/prisma/client";

/**
 * Prisma transaction client type.
 * Using a generic interface so both real tx and mocks satisfy it.
 */
interface PrismaTx {
  account: {
    findUnique: (args: { where: { id: string }; select: { id: true; number: true } }) => Promise<{ id: string; number: string } | null>;
    findFirst: (args: { where: { entityId: string; number: string; isActive?: boolean }; select?: { id: true; number: true } }) => Promise<{ id: string; number: string } | null>;
    findMany: (args: { where: { entityId: string; parentId: string }; orderBy: { number: "desc" }; take: number }) => Promise<{ id: string; number: string }[]>;
    create: (args: { data: { entityId: string; number: string; name: string; type: AccountType; parentId: string } }) => Promise<{ id: string; number: string; name: string; type: AccountType; parentId: string; entityId: string }>;
  };
  accountBalance: {
    create: (args: { data: { accountId: string; balance: number } }) => Promise<unknown>;
  };
}

/**
 * Creates a GL leaf account for a position under the holding's summary account.
 * Uses +10 stepping for position-level accounts.
 *
 * @param tx - Prisma transaction client
 * @param entityId - Entity the account belongs to
 * @param holdingAccountId - The holding's summary GL account (parent)
 * @param positionName - Name for the new position GL account
 * @param accountType - ASSET or LIABILITY
 * @returns The newly created Account
 */
export async function createPositionGLAccount(
  tx: PrismaTx,
  entityId: string,
  holdingAccountId: string,
  positionName: string,
  accountType: AccountType
) {
  // Find the holding's summary account
  const holdingAccount = await tx.account.findUnique({
    where: { id: holdingAccountId },
    select: { id: true, number: true },
  });
  if (!holdingAccount) throw new Error("Holding account not found");

  // Find highest child number under the holding account
  const siblings = await tx.account.findMany({
    where: { entityId, parentId: holdingAccountId },
    orderBy: { number: "desc" },
    take: 1,
  });

  const parentNum = parseInt(holdingAccount.number, 10);
  const nextNumber =
    siblings.length === 0
      ? (parentNum + 10).toString()
      : (parseInt(siblings[0].number, 10) + 10).toString();

  // Create the position GL leaf account
  const account = await tx.account.create({
    data: {
      entityId,
      number: nextNumber,
      name: positionName,
      type: accountType,
      parentId: holdingAccountId,
    },
  });

  // Create empty balance record
  await tx.accountBalance.create({
    data: { accountId: account.id, balance: 0 },
  });

  return account;
}

/**
 * Creates a GL summary account for a holding under the type parent account.
 * Uses +100 stepping for holding-level accounts.
 *
 * @param tx - Prisma transaction client
 * @param entityId - Entity the account belongs to
 * @param typeParentPrefix - The type parent account number prefix (e.g., "11000")
 * @param holdingName - Name for the new holding summary GL account
 * @param accountType - ASSET or LIABILITY
 * @returns The newly created Account
 */
export async function createHoldingSummaryAccount(
  tx: PrismaTx,
  entityId: string,
  typeParentPrefix: string,
  holdingName: string,
  accountType: AccountType
) {
  // Find the type parent account by number prefix
  const parentAccount = await tx.account.findFirst({
    where: { entityId, number: typeParentPrefix, isActive: true },
    select: { id: true, number: true },
  });
  if (!parentAccount) {
    throw new Error(
      `GL parent account ${typeParentPrefix} not found. Ensure the Chart of Accounts has been set up.`
    );
  }

  // Find highest child number under the type parent
  const siblings = await tx.account.findMany({
    where: { entityId, parentId: parentAccount.id },
    orderBy: { number: "desc" },
    take: 1,
  });

  const parentNum = parseInt(parentAccount.number, 10);
  const nextNumber =
    siblings.length === 0
      ? (parentNum + 100).toString()
      : (parseInt(siblings[0].number, 10) + 100).toString();

  // Create the holding summary account
  const account = await tx.account.create({
    data: {
      entityId,
      number: nextNumber,
      name: holdingName,
      type: accountType,
      parentId: parentAccount.id,
    },
  });

  // Create empty balance record
  await tx.accountBalance.create({
    data: { accountId: account.id, balance: 0 },
  });

  return account;
}
