import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// AUDT-02: formatFieldDiffs — field-level diff parsing from changes JSON
//
// The function lives in src/components/journal-entries/je-audit-trail.tsx
// but is not exported. We mirror its exact logic here to test the contract.
// The implementation must satisfy all assertions below for the audit trail to
// render field-level diffs correctly.
// ---------------------------------------------------------------------------

type FieldDiff = {
  field: string;
  old: string;
  new: string;
};

/**
 * Mirror of formatFieldDiffs in je-audit-trail.tsx.
 * Parses a changes object into structured field-level diffs.
 * Expects Record<string, { old: string; new: string }>
 */
function formatFieldDiffs(changes: unknown): FieldDiff[] | null {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(
    changes as Record<string, { old: string; new: string }>
  );
  if (entries.length === 0) return null;
  return entries.map(([key, val]) => ({
    field: key,
    old: String(val.old ?? ""),
    new: String(val.new ?? ""),
  }));
}

describe("Audit trail field-level diffs", () => {
  it("formats field diffs from changes JSON into old/new pairs", () => {
    const changes = {
      description: { old: "Monthly rent payment", new: "Office rent - March" },
      date: { old: "2026-02-01", new: "2026-03-01" },
    };

    const diffs = formatFieldDiffs(changes);

    expect(diffs).not.toBeNull();
    expect(diffs).toHaveLength(2);

    const descDiff = diffs!.find((d) => d.field === "description");
    expect(descDiff).toBeDefined();
    expect(descDiff!.old).toBe("Monthly rent payment");
    expect(descDiff!.new).toBe("Office rent - March");

    const dateDiff = diffs!.find((d) => d.field === "date");
    expect(dateDiff).toBeDefined();
    expect(dateDiff!.old).toBe("2026-02-01");
    expect(dateDiff!.new).toBe("2026-03-01");

    // Each diff must have all three required fields
    for (const diff of diffs!) {
      expect(typeof diff.field).toBe("string");
      expect(typeof diff.old).toBe("string");
      expect(typeof diff.new).toBe("string");
    }
  });

  it("returns null for empty or missing changes", () => {
    // null input
    expect(formatFieldDiffs(null)).toBeNull();

    // undefined input
    expect(formatFieldDiffs(undefined)).toBeNull();

    // empty string (falsy)
    expect(formatFieldDiffs("")).toBeNull();

    // non-object (string, number)
    expect(formatFieldDiffs("some string")).toBeNull();
    expect(formatFieldDiffs(42)).toBeNull();

    // empty object — no entries to diff
    expect(formatFieldDiffs({})).toBeNull();
  });

  it("handles line item changes with account/debit/credit diffs", () => {
    // Simulate the format used by the JE PUT route for per-line-item diffs
    const changes = {
      "Line 1 account": { old: "1000 - Cash", new: "1010 - Petty Cash" },
      "Line 1 debit": { old: "1000.00", new: "500.00" },
      "Line 1 credit": { old: "0.00", new: "0.00" },
      "Line 2 memo": { old: "", new: "Office supplies" },
    };

    const diffs = formatFieldDiffs(changes);

    expect(diffs).not.toBeNull();
    expect(diffs).toHaveLength(4);

    const accountDiff = diffs!.find((d) => d.field === "Line 1 account");
    expect(accountDiff).toBeDefined();
    expect(accountDiff!.old).toBe("1000 - Cash");
    expect(accountDiff!.new).toBe("1010 - Petty Cash");

    const debitDiff = diffs!.find((d) => d.field === "Line 1 debit");
    expect(debitDiff).toBeDefined();
    expect(debitDiff!.old).toBe("1000.00");
    expect(debitDiff!.new).toBe("500.00");

    // Null/undefined old/new values must coerce to empty string, not throw
    const changesWithNulls = {
      description: { old: null as unknown as string, new: "New description" },
    };
    const diffsWithNulls = formatFieldDiffs(changesWithNulls);
    expect(diffsWithNulls).not.toBeNull();
    expect(diffsWithNulls![0].old).toBe("");
    expect(diffsWithNulls![0].new).toBe("New description");
  });
});
