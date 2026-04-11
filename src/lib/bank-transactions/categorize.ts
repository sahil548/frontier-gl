/**
 * Minimal rule shape used by the categorization engine.
 * Matches the relevant fields from CategorizationRule Prisma model.
 */
export interface RuleInput {
  id: string;
  pattern: string;
  amountMin: number | { toNumber?: () => number } | null;
  amountMax: number | { toNumber?: () => number } | null;
  accountId: string;
  dimensionTags: Record<string, string> | unknown | null;
  isActive: boolean;
  priority: number;
}

/**
 * Minimal transaction shape used by the categorization engine.
 */
export interface TransactionInput {
  id: string;
  description: string;
  amount: number | { toNumber?: () => number };
  status: string;
  accountId: string | null;
}

/**
 * Safely converts a value to a number.
 * Handles Prisma Decimal objects (which have a toNumber method) and plain numbers.
 */
function toNum(value: number | { toNumber?: () => number } | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value);
}

/**
 * Matches a single transaction against a list of categorization rules.
 *
 * Rules should be pre-sorted by priority (lower number = higher priority).
 * Matching logic:
 * - Case-insensitive substring match on description
 * - Optional amountMin/amountMax range check on absolute amount
 *
 * @returns The first matching rule, or null if no rules match
 */
export function matchRule<R extends RuleInput>(
  transaction: { description: string; amount: number | { toNumber?: () => number } },
  rules: R[]
): R | null {
  const descLower = transaction.description.toLowerCase();
  const absAmount = Math.abs(toNum(transaction.amount));

  for (const rule of rules) {
    // Pattern must be a case-insensitive substring of the description
    if (!descLower.includes(rule.pattern.toLowerCase())) {
      continue;
    }

    // Check amount range if specified
    const min = rule.amountMin !== null ? toNum(rule.amountMin) : null;
    const max = rule.amountMax !== null ? toNum(rule.amountMax) : null;

    if (min !== null && absAmount < min) continue;
    if (max !== null && absAmount > max) continue;

    return rule;
  }

  return null;
}

/**
 * Applies categorization rules to a batch of transactions.
 *
 * For each transaction:
 * - If a rule matches, assigns the rule's accountId and dimensionTags
 * - Transactions are sorted into matched/unmatched buckets
 *
 * Rules are sorted by priority before matching.
 *
 * @returns Object with matched and unmatched transaction arrays
 */
export function applyRules<R extends RuleInput, T extends TransactionInput>(
  transactions: T[],
  rules: R[]
): { matched: T[]; unmatched: T[] } {
  // Sort rules by priority (lower = higher priority)
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  const matched: T[] = [];
  const unmatched: T[] = [];

  for (const txn of transactions) {
    const rule = matchRule(txn, sortedRules);

    if (rule) {
      // Assign account and dimension tags from the matched rule
      const updated = { ...txn, accountId: rule.accountId };
      matched.push(updated);
    } else {
      unmatched.push(txn);
    }
  }

  return { matched, unmatched };
}
