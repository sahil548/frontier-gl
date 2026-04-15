/**
 * Pure helpers for determining which holdings are eligible for the
 * rate-based budget slide-over on /budgets, and for computing the
 * effective market value used as the base for the monthly rate math.
 *
 * Phase 10 moved market values onto Position rows; family office /
 * hedge fund workflows typically leave holding.fairMarketValue null
 * and set marketValue on the underlying positions. This module
 * encapsulates the "holding FMV OR sum of position FMVs" rule so
 * both the UI filter and the server-side rate-target lookup use the
 * same source of truth.
 *
 * No Prisma usage here — purely string/number transformations so the
 * helpers are trivially unit-testable and reusable client + server.
 */

export interface HoldingWithPositions {
  fairMarketValue: string | null;
  positions?: Array<{ marketValue: string | null }>;
}

function toNum(v: string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Returns the effective market value to use for rate-based computations.
 *
 * Rule: holding-level FMV wins when non-zero; otherwise fall back to the
 * sum of active position marketValues. If both are zero/null, returns 0.
 */
export function computeEffectiveMarketValue(h: HoldingWithPositions): number {
  const holdingFmv = toNum(h.fairMarketValue);
  if (holdingFmv > 0) return holdingFmv;
  const positionSum = (h.positions ?? []).reduce(
    (sum, p) => sum + toNum(p.marketValue),
    0,
  );
  return positionSum;
}

/**
 * A holding qualifies for the rate-target slide-over iff it has any
 * positive market-value signal — holding FMV OR any position with
 * non-zero marketValue. Zero-value holdings are excluded because
 * rate-math against zero produces a zero budget.
 */
export function isHoldingEligibleForRateTarget(h: HoldingWithPositions): boolean {
  return computeEffectiveMarketValue(h) > 0;
}
