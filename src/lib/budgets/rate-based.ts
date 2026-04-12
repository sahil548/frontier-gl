import Decimal from "decimal.js";

/**
 * Input for rate-based budget computation.
 *
 * holdingMarketValue: Current market value of the investment holding.
 * annualReturnRate: Expected annual return as a decimal (e.g., 0.08 for 8%).
 */
export interface RateBudgetInput {
  holdingMarketValue: Decimal;
  annualReturnRate: number;
}

/**
 * Computes the monthly budget amount from a holding's market value and
 * a target annual return rate.
 *
 * Formula: monthly = holdingValue * rate / 12
 *
 * The result is rounded to 4 decimal places to match Decimal(19,4) precision.
 * This is a snapshot computation -- the result is stored once and does NOT
 * auto-recalculate when holding values change.
 */
export function computeMonthlyBudget(input: RateBudgetInput): Decimal {
  return input.holdingMarketValue
    .times(new Decimal(input.annualReturnRate))
    .dividedBy(12)
    .toDecimalPlaces(4);
}
