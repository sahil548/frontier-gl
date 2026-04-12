import { describe, it } from "vitest";

describe("Auto-Reconcile on Post", () => {
  // REC-01: Auto-reconcile when transaction is posted
  it.todo("sets reconciliationStatus to RECONCILED when transaction is posted");
  it.todo("does not change reconciliationStatus for excluded transactions");
  it.todo("handles bulk-post setting reconciliationStatus on all transactions");
});
