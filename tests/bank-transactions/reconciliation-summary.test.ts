import { describe, it, expect } from "vitest";

// REC-04: Reconciliation Summary stats
//
// Test pattern: mirror-inline (RESEARCH.md Pattern 2 / Example 6).
//
// The production logic is a `useMemo` reducer inside the React component at
// src/components/bank-feed/reconciliation-summary.tsx:17-50. It is not exported
// and has no headless helper. Rendering the component to assert the reducer
// output would require jsdom + React Testing Library plumbing we do not want
// for a pure numeric computation. Mirror-inline keeps the contract visible and
// reviewable at the test-file level.

function computeReconciliationStats(
  transactions: Array<{ amount: string | number; reconciliationStatus?: string }>
) {
  let reconciledCount = 0;
  let pendingCount = 0;
  let unmatchedCount = 0;
  let reconciledTotal = 0;
  let unreconciledTotal = 0;

  for (const txn of transactions) {
    const absAmount = Math.abs(
      typeof txn.amount === "string" ? parseFloat(txn.amount) : txn.amount
    );
    const status = txn.reconciliationStatus ?? "PENDING";
    if (status === "RECONCILED") {
      reconciledCount++;
      reconciledTotal += absAmount;
    } else if (status === "UNMATCHED") {
      unmatchedCount++;
      unreconciledTotal += absAmount;
    } else {
      // PENDING or any other status
      pendingCount++;
      unreconciledTotal += absAmount;
    }
  }

  return {
    reconciledCount,
    pendingCount,
    unmatchedCount,
    reconciledTotal,
    unreconciledTotal,
  };
}

describe("Reconciliation Summary (REC-04)", () => {
  it("computes correct count of RECONCILED transactions", () => {
    const stats = computeReconciliationStats([
      { amount: "100.00", reconciliationStatus: "RECONCILED" },
      { amount: "250.00", reconciliationStatus: "RECONCILED" },
      { amount: "50.00", reconciliationStatus: "PENDING" },
    ]);
    expect(stats.reconciledCount).toBe(2);
    expect(stats.pendingCount).toBe(1);
    expect(stats.unmatchedCount).toBe(0);
  });

  it("computes correct count of PENDING transactions (missing status defaults to PENDING)", () => {
    // Production code uses `txn.reconciliationStatus ?? "PENDING"` -- a row with
    // no reconciliationStatus field must count as PENDING.
    const stats = computeReconciliationStats([
      { amount: "100.00" }, // missing status -> PENDING
      { amount: "200.00", reconciliationStatus: "PENDING" },
    ]);
    expect(stats.pendingCount).toBe(2);
    expect(stats.reconciledCount).toBe(0);
    expect(stats.unmatchedCount).toBe(0);
  });

  it("computes running totals for reconciled vs unreconciled amounts (absolute values, exercises UNMATCHED)", () => {
    // Mix of signed amounts and statuses. Totals use Math.abs so outflows
    // (negative amounts) contribute the same magnitude as inflows.
    // UNMATCHED exercises the third branch of the reducer.
    const stats = computeReconciliationStats([
      { amount: "-100.00", reconciliationStatus: "RECONCILED" }, // outflow, reconciled
      { amount: "500.00", reconciliationStatus: "RECONCILED" }, // inflow, reconciled
      { amount: "-50.00", reconciliationStatus: "PENDING" }, // outflow, pending
      { amount: "75.00", reconciliationStatus: "UNMATCHED" }, // unmatched
      { amount: 25, reconciliationStatus: "PENDING" }, // numeric amount
    ]);
    expect(stats.reconciledCount).toBe(2);
    expect(stats.pendingCount).toBe(2);
    expect(stats.unmatchedCount).toBe(1);
    // reconciledTotal = |100| + |500| = 600
    expect(stats.reconciledTotal).toBe(600);
    // unreconciledTotal = |50| (pending) + |75| (unmatched) + |25| (pending) = 150
    expect(stats.unreconciledTotal).toBe(150);
  });
});
