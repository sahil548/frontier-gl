import { describe, it } from "vitest";

// ---------------------------------------------------------------------------
// Plaid sync test stubs
//
// These cover BANK-02 behavior that will be implemented in Plan 03
// (Plaid integration). Marked as it.todo to signal planned test coverage.
// ---------------------------------------------------------------------------

describe("plaidSync", () => {
  it.todo("syncs new transactions from Plaid using cursor-based pagination");
  it.todo("updates syncCursor after successful sync");
  it.todo("handles Plaid API rate limit errors with retry");
  it.todo("marks connection as ERROR status on persistent failure");
  it.todo("skips already-imported transactions by externalId");
  it.todo("converts Plaid transaction amounts to GL convention (sign)");
});
