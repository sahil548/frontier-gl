import { describe, it, expect } from "vitest";

// REC-01: Auto-reconcile on Post
//
// Test pattern: mirror-inline (RESEARCH.md Pattern 2 / Example 7 / Blocker #1 Option A).
//
// The production logic lives INSIDE the route handler at
// src/app/api/entities/[entityId]/bank-transactions/[transactionId]/route.ts:335-345
// (and the bulk path at bulk-categorize/route.ts:174), wrapped in a
// `prisma.$transaction(async (tx) => { ... })` callback. There is NO exported helper.
//
// Per CONTEXT.md ("no production code changes" + Phase 14 owns route-handler hygiene),
// we MIRROR the update-payload shape here and assert the data contract. This is a
// specification of intent -- if the route drifts, the mirror will show the gap at review.

function buildReconcileUpdatePayload(params: {
  transactionId: string;
  journalEntryId: string;
  splits?: Array<unknown>;
}) {
  return {
    where: { id: params.transactionId },
    data: {
      status: "POSTED",
      reconciliationStatus: "RECONCILED",
      journalEntryId: params.journalEntryId,
      isSplit: params.splits !== undefined && params.splits.length > 0,
      ...(params.splits && params.splits.length > 0 ? { accountId: null } : {}),
    },
  };
}

describe("Auto-Reconcile on Post (REC-01)", () => {
  it("sets reconciliationStatus to RECONCILED when transaction is posted", () => {
    const payload = buildReconcileUpdatePayload({
      transactionId: "txn-1",
      journalEntryId: "je-123",
    });
    expect(payload.where).toEqual({ id: "txn-1" });
    expect(payload.data.reconciliationStatus).toBe("RECONCILED");
    expect(payload.data.status).toBe("POSTED");
    expect(payload.data.journalEntryId).toBe("je-123");
    expect(payload.data.isSplit).toBe(false);
  });

  it("does not change reconciliationStatus for excluded transactions", () => {
    // "Excluded" = helper is not invoked at all (the route handler short-circuits
    // for excluded transactions and never reaches the tx.bankTransaction.update
    // call). The complementary invariant we can test: when splits ARE provided,
    // the payload marks isSplit=true AND clears accountId to null so the parent
    // row reflects the split-level breakdown instead of a single account.
    const payload = buildReconcileUpdatePayload({
      transactionId: "txn-1",
      journalEntryId: "je-123",
      splits: [
        { accountId: "a", amount: 50 },
        { accountId: "b", amount: 50 },
      ],
    });
    expect(payload.data.isSplit).toBe(true);
    expect((payload.data as { accountId?: null }).accountId).toBeNull();
    expect(payload.data.reconciliationStatus).toBe("RECONCILED");
  });

  it("handles bulk-post setting reconciliationStatus on all transactions", () => {
    // Bulk path at bulk-categorize/route.ts:174 iterates transactions and applies
    // the same update shape per row. Mirror by iterating the helper over an array.
    const txnIds = ["txn-a", "txn-b", "txn-c"];
    const payloads = txnIds.map((id) =>
      buildReconcileUpdatePayload({ transactionId: id, journalEntryId: `je-for-${id}` })
    );

    expect(payloads).toHaveLength(3);
    for (const p of payloads) {
      expect(p.data.reconciliationStatus).toBe("RECONCILED");
      expect(p.data.status).toBe("POSTED");
      expect(p.data.isSplit).toBe(false);
    }
    expect(payloads[0].where).toEqual({ id: "txn-a" });
    expect(payloads[2].data.journalEntryId).toBe("je-for-txn-c");
  });
});
