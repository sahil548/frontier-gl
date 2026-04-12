import { Prisma } from "@/generated/prisma/client";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";

// ─── Pure functions (unit-testable) ─────────────────────

/**
 * Determines debit/credit direction for an opening balance JE.
 * Assets: debit holding GL (increase asset), credit OBE
 * Liabilities: debit OBE, credit holding GL (increase liability)
 */
export function determineJEDirection(
  accountType: string,
  holdingAccountId: string,
  obeAccountId: string
): { debitAccountId: string; creditAccountId: string } {
  if (accountType === "LIABILITY") {
    return { debitAccountId: obeAccountId, creditAccountId: holdingAccountId };
  }
  // ASSET and all other types: standard direction
  return { debitAccountId: holdingAccountId, creditAccountId: obeAccountId };
}

/**
 * Computes the adjustment between old and new balance.
 * Returns null if no adjustment needed (balances are equal).
 */
export function computeAdjustment(
  oldBalance: number,
  newBalance: number
): { amount: number; isIncrease: boolean } | null {
  const difference = newBalance - oldBalance;
  if (difference === 0) return null;
  return {
    amount: Math.abs(difference),
    isIncrease: difference > 0,
  };
}

// ─── Prisma transaction functions ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

/**
 * Finds or creates the Opening Balance Equity account for an entity.
 * Starts at account number 3900; increments if taken (3901, 3902...).
 */
export async function findOrCreateOBEAccount(
  tx: PrismaTransactionClient,
  entityId: string
): Promise<{ id: string }> {
  // Try to find existing OBE account
  const existing = await tx.account.findFirst({
    where: { entityId, name: "Opening Balance Equity", type: "EQUITY" },
    select: { id: true },
  });
  if (existing) return existing;

  // Find next available number starting at 3900
  let number = 3900;
  while (true) {
    const taken = await tx.account.findFirst({
      where: { entityId, number: String(number) },
      select: { id: true },
    });
    if (!taken) break;
    number++;
    if (number > 3999) {
      throw new Error("No available account number for Opening Balance Equity (3900-3999 exhausted)");
    }
  }

  // Create the OBE account
  const newAccount = await tx.account.create({
    data: {
      entityId,
      number: String(number),
      name: "Opening Balance Equity",
      type: "EQUITY",
      parentId: null,
    },
  });

  // Create empty AccountBalance row
  await tx.accountBalance.create({
    data: { accountId: newAccount.id, balance: 0 },
  });

  return { id: newAccount.id };
}

/**
 * Generates and posts an opening balance JE when a holding is created with a non-zero balance.
 * Returns the JE id, or null if balance is zero (no JE needed).
 */
export async function generateOpeningBalanceJE(
  tx: PrismaTransactionClient,
  params: {
    entityId: string;
    userId: string;
    holdingAccountId: string;
    holdingAccountType: string;
    balance: number;
    date: Date;
  }
): Promise<string | null> {
  const { entityId, userId, holdingAccountId, holdingAccountType, balance, date } = params;

  // Guard: skip when balance is 0
  if (balance === 0) return null;

  const obe = await findOrCreateOBEAccount(tx, entityId);
  const { debitAccountId, creditAccountId } = determineJEDirection(
    holdingAccountType,
    holdingAccountId,
    obe.id
  );

  const entryNumber = await generateNextEntryNumber(tx, entityId);
  const amount = Math.abs(balance);
  const decimalAmount = new Prisma.Decimal(amount);
  const now = new Date();

  // Create POSTED journal entry
  const je = await tx.journalEntry.create({
    data: {
      entityId,
      entryNumber,
      date,
      description: "Opening balance",
      status: "POSTED",
      createdBy: userId,
      postedBy: userId,
      postedAt: now,
      lineItems: {
        create: [
          {
            accountId: debitAccountId,
            debit: decimalAmount,
            credit: 0,
            memo: "Opening balance",
            sortOrder: 1,
          },
          {
            accountId: creditAccountId,
            debit: 0,
            credit: decimalAmount,
            memo: "Opening balance",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // Update AccountBalance for debit account (debit increases balance)
  const debitChange = new Prisma.Decimal(amount);
  await tx.accountBalance.upsert({
    where: { accountId: debitAccountId },
    create: {
      accountId: debitAccountId,
      debitTotal: decimalAmount,
      creditTotal: 0,
      balance: debitChange,
    },
    update: {
      debitTotal: { increment: decimalAmount },
      balance: { increment: debitChange },
    },
  });

  // Update AccountBalance for credit account (credit decreases balance)
  const creditChange = new Prisma.Decimal(-amount);
  await tx.accountBalance.upsert({
    where: { accountId: creditAccountId },
    create: {
      accountId: creditAccountId,
      debitTotal: 0,
      creditTotal: decimalAmount,
      balance: creditChange,
    },
    update: {
      creditTotal: { increment: decimalAmount },
      balance: { increment: creditChange },
    },
  });

  // Create audit trail entry
  await tx.journalEntryAudit.create({
    data: {
      journalEntryId: je.id,
      action: "POSTED",
      userId,
    },
  });

  return je.id;
}

/**
 * Generates and posts an adjusting JE when a holding balance is edited.
 * Returns the JE id, or null if balance did not change.
 */
export async function generateAdjustingJE(
  tx: PrismaTransactionClient,
  params: {
    entityId: string;
    userId: string;
    holdingAccountId: string;
    holdingAccountType: string;
    oldBalance: number;
    newBalance: number;
    date: Date;
  }
): Promise<string | null> {
  const { entityId, userId, holdingAccountId, holdingAccountType, oldBalance, newBalance, date } = params;

  const adjustment = computeAdjustment(oldBalance, newBalance);
  if (!adjustment) return null;

  const obe = await findOrCreateOBEAccount(tx, entityId);

  // If balance increases, same direction as opening balance
  // If balance decreases, reverse direction
  let debitAccountId: string;
  let creditAccountId: string;

  if (adjustment.isIncrease) {
    const direction = determineJEDirection(holdingAccountType, holdingAccountId, obe.id);
    debitAccountId = direction.debitAccountId;
    creditAccountId = direction.creditAccountId;
  } else {
    // Reverse direction for decrease
    const direction = determineJEDirection(holdingAccountType, holdingAccountId, obe.id);
    debitAccountId = direction.creditAccountId;
    creditAccountId = direction.debitAccountId;
  }

  const entryNumber = await generateNextEntryNumber(tx, entityId);
  const decimalAmount = new Prisma.Decimal(adjustment.amount);
  const now = new Date();

  // Create POSTED journal entry
  const je = await tx.journalEntry.create({
    data: {
      entityId,
      entryNumber,
      date,
      description: "Balance adjustment",
      status: "POSTED",
      createdBy: userId,
      postedBy: userId,
      postedAt: now,
      lineItems: {
        create: [
          {
            accountId: debitAccountId,
            debit: decimalAmount,
            credit: 0,
            memo: "Balance adjustment",
            sortOrder: 1,
          },
          {
            accountId: creditAccountId,
            debit: 0,
            credit: decimalAmount,
            memo: "Balance adjustment",
            sortOrder: 2,
          },
        ],
      },
    },
  });

  // Update AccountBalance for debit account
  const debitChange = new Prisma.Decimal(adjustment.amount);
  await tx.accountBalance.upsert({
    where: { accountId: debitAccountId },
    create: {
      accountId: debitAccountId,
      debitTotal: decimalAmount,
      creditTotal: 0,
      balance: debitChange,
    },
    update: {
      debitTotal: { increment: decimalAmount },
      balance: { increment: debitChange },
    },
  });

  // Update AccountBalance for credit account
  const creditChange = new Prisma.Decimal(-adjustment.amount);
  await tx.accountBalance.upsert({
    where: { accountId: creditAccountId },
    create: {
      accountId: creditAccountId,
      debitTotal: 0,
      creditTotal: decimalAmount,
      balance: creditChange,
    },
    update: {
      creditTotal: { increment: decimalAmount },
      balance: { increment: creditChange },
    },
  });

  // Create audit trail entry
  await tx.journalEntryAudit.create({
    data: {
      journalEntryId: je.id,
      action: "POSTED",
      userId,
    },
  });

  return je.id;
}
