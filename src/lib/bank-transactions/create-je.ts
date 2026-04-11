/**
 * Split line input for transaction splits.
 */
export interface SplitLine {
  accountId: string;
  amount: number;
  memo?: string;
}

/**
 * Transaction input for JE creation.
 */
export interface TransactionForJE {
  id: string;
  date: Date;
  description: string;
  amount: number;
  accountId: string | null;
}

/**
 * Journal entry line item output shape.
 */
export interface JELineItem {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
  sortOrder: number;
}

/**
 * Journal entry creation output shape.
 * Matches the data structure needed for Prisma journalEntry.create.
 */
export interface JournalEntryCreateInput {
  entityId: string;
  date: Date;
  description: string;
  status: "DRAFT" | "POSTED";
  createdBy: string;
  postedBy?: string;
  postedAt?: Date;
  lineItems: JELineItem[];
}

/**
 * Creates a journal entry data object from a bank transaction.
 *
 * For non-split transactions:
 * - Expense (negative amount): debit categorized account, credit bank account
 * - Deposit (positive amount): debit bank account, credit categorized account
 *
 * For split transactions:
 * - Expense: multiple debit lines to split accounts, one credit to bank account
 * - Deposit: one debit to bank account, multiple credit lines to split accounts
 *
 * @throws Error if split amounts don't sum to the absolute transaction amount
 * @throws Error if non-split transaction has no accountId
 */
export function createJournalEntryFromTransaction(params: {
  transaction: TransactionForJE;
  bankAccountId: string;
  entityId: string;
  userId: string;
  splits?: SplitLine[];
  postImmediately: boolean;
}): JournalEntryCreateInput {
  const { transaction, bankAccountId, entityId, userId, splits, postImmediately } = params;
  const absAmount = Math.abs(transaction.amount);
  const isExpense = transaction.amount < 0; // negative = money leaving bank

  const lineItems: JELineItem[] = [];

  if (splits && splits.length > 0) {
    // Validate split amounts sum to transaction amount
    const splitSum = splits.reduce((sum, s) => sum + s.amount, 0);
    // Allow small floating point tolerance
    if (Math.abs(splitSum - absAmount) > 0.005) {
      throw new Error(
        `Split amounts sum to ${splitSum.toFixed(4)} but transaction amount is ${absAmount.toFixed(4)}`
      );
    }

    if (isExpense) {
      // Multiple debit lines to split accounts
      splits.forEach((split, idx) => {
        lineItems.push({
          accountId: split.accountId,
          debit: split.amount,
          credit: 0,
          memo: split.memo,
          sortOrder: idx,
        });
      });
      // One credit line to bank account
      lineItems.push({
        accountId: bankAccountId,
        debit: 0,
        credit: absAmount,
        sortOrder: splits.length,
      });
    } else {
      // One debit line to bank account
      lineItems.push({
        accountId: bankAccountId,
        debit: absAmount,
        credit: 0,
        sortOrder: 0,
      });
      // Multiple credit lines to split accounts
      splits.forEach((split, idx) => {
        lineItems.push({
          accountId: split.accountId,
          debit: 0,
          credit: split.amount,
          memo: split.memo,
          sortOrder: idx + 1,
        });
      });
    }
  } else {
    // Non-split: single debit + single credit
    if (!transaction.accountId) {
      throw new Error("Non-split transaction must have an accountId assigned");
    }

    if (isExpense) {
      // Debit expense/categorized account, credit bank account
      lineItems.push({
        accountId: transaction.accountId,
        debit: absAmount,
        credit: 0,
        sortOrder: 0,
      });
      lineItems.push({
        accountId: bankAccountId,
        debit: 0,
        credit: absAmount,
        sortOrder: 1,
      });
    } else {
      // Debit bank account, credit income/categorized account
      lineItems.push({
        accountId: bankAccountId,
        debit: absAmount,
        credit: 0,
        sortOrder: 0,
      });
      lineItems.push({
        accountId: transaction.accountId,
        debit: 0,
        credit: absAmount,
        sortOrder: 1,
      });
    }
  }

  const result: JournalEntryCreateInput = {
    entityId,
    date: transaction.date,
    description: transaction.description,
    status: postImmediately ? "POSTED" : "DRAFT",
    createdBy: userId,
    lineItems,
  };

  if (postImmediately) {
    result.postedBy = userId;
    result.postedAt = new Date();
  }

  return result;
}
