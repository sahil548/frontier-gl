/**
 * Pure helpers for onboarding wizard progress logic.
 *
 * These helpers are used by:
 * - src/app/api/entities/[entityId]/wizard-progress/route.ts (server backfill)
 * - src/components/onboarding/setup-banner.tsx (dashboard banner visibility)
 * - src/components/onboarding/return-to-wizard-banner.tsx (header banner visibility)
 *
 * Centralizing the "is wizard in progress?" and "does this entity have substantive data?"
 * decisions here keeps the client banners and the server-side backfill in sync.
 */

// ── Types ───────────────────────────────────────────────

export interface WizardProgress {
  coaComplete: boolean;
  holdingsComplete: boolean;
  balancesComplete: boolean;
  transactionsComplete: boolean;
  dismissedAt?: string;
}

export interface SubstantiveDataCounts {
  accountCount: number;
  postedJECount: number;
  holdingCount: number;
}

// ── Constants ───────────────────────────────────────────

export const WIZARD_DEFAULT: WizardProgress = {
  coaComplete: false,
  holdingsComplete: false,
  balancesComplete: false,
  transactionsComplete: false,
};

// ── Helpers ─────────────────────────────────────────────

/**
 * Is the wizard still in-progress for this entity?
 *
 * Returns true when:
 *  - progress is null/undefined (nothing stored yet), or
 *  - progress exists, is not dismissed, and not all four steps are complete
 *
 * Returns false when:
 *  - dismissedAt is set (user actively dismissed), or
 *  - all four steps are complete
 */
export function isWizardInProgress(
  progress: WizardProgress | null | undefined
): boolean {
  if (!progress) return true;
  if (progress.dismissedAt) return false;
  const allComplete =
    progress.coaComplete &&
    progress.holdingsComplete &&
    progress.balancesComplete &&
    progress.transactionsComplete;
  return !allComplete;
}

/**
 * Does this entity have substantive data (COA imported OR posted JEs OR holdings)?
 *
 * Used by the wizard-progress GET handler to detect pre-existing entities that
 * predate the wizard feature. When true AND stored progress is null/default,
 * the server backfills progress to all-complete so the banner does not show.
 *
 * Thresholds:
 *  - accountCount > 5: family office template creates ~40 accounts; 5 is a safety floor
 *    above the default empty state.
 *  - postedJECount > 0: any posted JE means the entity has real activity
 *  - holdingCount > 0: any active holding means the entity has real state
 */
export function hasSubstantiveData(counts: SubstantiveDataCounts): boolean {
  return (
    counts.accountCount > 5 ||
    counts.postedJECount > 0 ||
    counts.holdingCount > 0
  );
}

/**
 * Produce a WizardProgress object with all four steps marked complete.
 * Used for one-time backfill of pre-existing entities on first GET.
 */
export function backfillCompleteProgress(): WizardProgress {
  return {
    coaComplete: true,
    holdingsComplete: true,
    balancesComplete: true,
    transactionsComplete: true,
  };
}
