import { describe, test, expect } from "vitest";
import {
  isWizardInProgress,
  hasSubstantiveData,
  WIZARD_DEFAULT,
  backfillCompleteProgress,
  type WizardProgress,
} from "@/lib/onboarding/wizard-progress";

describe("WIZARD_DEFAULT", () => {
  test("has all booleans false and no dismissedAt", () => {
    expect(WIZARD_DEFAULT.coaComplete).toBe(false);
    expect(WIZARD_DEFAULT.holdingsComplete).toBe(false);
    expect(WIZARD_DEFAULT.balancesComplete).toBe(false);
    expect(WIZARD_DEFAULT.transactionsComplete).toBe(false);
    expect(WIZARD_DEFAULT.dismissedAt).toBeUndefined();
  });
});

describe("isWizardInProgress", () => {
  test("returns true when progress is null", () => {
    expect(isWizardInProgress(null)).toBe(true);
  });

  test("returns true when progress is undefined", () => {
    expect(isWizardInProgress(undefined)).toBe(true);
  });

  test("returns true when some but not all steps are complete AND dismissedAt unset", () => {
    const progress: WizardProgress = {
      coaComplete: true,
      holdingsComplete: false,
      balancesComplete: true,
      transactionsComplete: false,
    };
    expect(isWizardInProgress(progress)).toBe(true);
  });

  test("returns true when all steps are incomplete (default state)", () => {
    expect(isWizardInProgress(WIZARD_DEFAULT)).toBe(true);
  });

  test("returns false when all four steps are complete", () => {
    const progress: WizardProgress = {
      coaComplete: true,
      holdingsComplete: true,
      balancesComplete: true,
      transactionsComplete: true,
    };
    expect(isWizardInProgress(progress)).toBe(false);
  });

  test("returns false when dismissedAt is set (user actively dismissed)", () => {
    const progress: WizardProgress = {
      coaComplete: false,
      holdingsComplete: false,
      balancesComplete: false,
      transactionsComplete: false,
      dismissedAt: "2026-04-14T12:00:00.000Z",
    };
    expect(isWizardInProgress(progress)).toBe(false);
  });

  test("returns false when dismissedAt is set even with partial progress", () => {
    const progress: WizardProgress = {
      coaComplete: true,
      holdingsComplete: false,
      balancesComplete: false,
      transactionsComplete: false,
      dismissedAt: "2026-04-14T12:00:00.000Z",
    };
    expect(isWizardInProgress(progress)).toBe(false);
  });
});

describe("hasSubstantiveData", () => {
  test("returns true when accountCount > 5", () => {
    expect(
      hasSubstantiveData({ accountCount: 6, postedJECount: 0, holdingCount: 0 })
    ).toBe(true);
  });

  test("returns true when postedJECount > 0", () => {
    expect(
      hasSubstantiveData({ accountCount: 0, postedJECount: 1, holdingCount: 0 })
    ).toBe(true);
  });

  test("returns true when holdingCount > 0", () => {
    expect(
      hasSubstantiveData({ accountCount: 0, postedJECount: 0, holdingCount: 1 })
    ).toBe(true);
  });

  test("returns false when all three counts are below thresholds", () => {
    expect(
      hasSubstantiveData({ accountCount: 5, postedJECount: 0, holdingCount: 0 })
    ).toBe(false);
  });

  test("returns false when accountCount equals 5 (at threshold, not above)", () => {
    expect(
      hasSubstantiveData({ accountCount: 5, postedJECount: 0, holdingCount: 0 })
    ).toBe(false);
  });

  test("returns true for substantial counts across all categories", () => {
    expect(
      hasSubstantiveData({ accountCount: 40, postedJECount: 12, holdingCount: 8 })
    ).toBe(true);
  });

  test("returns false for empty state", () => {
    expect(
      hasSubstantiveData({ accountCount: 0, postedJECount: 0, holdingCount: 0 })
    ).toBe(false);
  });
});

describe("backfillCompleteProgress", () => {
  test("returns all four steps complete with no dismissedAt", () => {
    const result = backfillCompleteProgress();
    expect(result.coaComplete).toBe(true);
    expect(result.holdingsComplete).toBe(true);
    expect(result.balancesComplete).toBe(true);
    expect(result.transactionsComplete).toBe(true);
    expect(result.dismissedAt).toBeUndefined();
  });

  test("produces an object isWizardInProgress treats as complete (returns false)", () => {
    expect(isWizardInProgress(backfillCompleteProgress())).toBe(false);
  });
});
