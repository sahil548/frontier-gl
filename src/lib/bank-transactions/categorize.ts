/**
 * Minimal rule shape used by the categorization engine.
 * Matches the relevant fields from CategorizationRule Prisma model.
 */
export interface RuleInput {
  id: string;
  pattern: string;
  amountMin: number | { toNumber?: () => number } | null;
  amountMax: number | { toNumber?: () => number } | null;
  accountId: string | null;
  positionId?: string | null;
  dimensionTags: Record<string, string> | unknown | null;
  isActive: boolean;
  priority: number;
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
