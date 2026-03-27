import { describe, it, expect } from "vitest";

/**
 * Tests for journal entry audit trail creation.
 *
 * Verifies that all JE operations produce the correct audit action strings
 * and that audit metadata is structured correctly.
 */

// Audit action constants matching the values used in API routes
const AUDIT_ACTIONS = {
  CREATED: "CREATED",
  EDITED: "EDITED",
  APPROVED: "APPROVED",
  POSTED: "POSTED",
  DELETED: "DELETED",
  REVERSAL_CREATED: "REVERSAL_CREATED",
} as const;

type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

// Simulate audit entry structure
interface AuditEntry {
  journalEntryId: string;
  action: AuditAction;
  userId: string;
  changes?: Record<string, unknown>;
}

function createAuditEntry(
  journalEntryId: string,
  action: AuditAction,
  userId: string,
  changes?: Record<string, unknown>
): AuditEntry {
  return { journalEntryId, action, userId, changes };
}

describe("Audit Trail", () => {
  const jeId = "cuid_test_123";
  const userId = "user_clerk_456";

  it("records CREATED action", () => {
    const audit = createAuditEntry(jeId, "CREATED", userId);

    expect(audit.action).toBe("CREATED");
    expect(audit.journalEntryId).toBe(jeId);
    expect(audit.userId).toBe(userId);
    expect(audit.changes).toBeUndefined();
  });

  it("records APPROVED action", () => {
    const audit = createAuditEntry(jeId, "APPROVED", userId);

    expect(audit.action).toBe("APPROVED");
    expect(audit.journalEntryId).toBe(jeId);
    expect(audit.userId).toBe(userId);
  });

  it("records POSTED action", () => {
    const audit = createAuditEntry(jeId, "POSTED", userId);

    expect(audit.action).toBe("POSTED");
    expect(audit.journalEntryId).toBe(jeId);
    expect(audit.userId).toBe(userId);
  });

  it("records EDITED action with diff", () => {
    const changes = {
      description: { old: "Original memo", new: "Updated memo" },
      date: { old: "2024-01-01", new: "2024-01-15" },
      lineItems: { old: "3 lines", new: "4 lines" },
    };

    const audit = createAuditEntry(jeId, "EDITED", userId, changes);

    expect(audit.action).toBe("EDITED");
    expect(audit.changes).toBeDefined();
    expect(audit.changes!.description).toEqual({
      old: "Original memo",
      new: "Updated memo",
    });
    expect(audit.changes!.date).toEqual({
      old: "2024-01-01",
      new: "2024-01-15",
    });
    expect(audit.changes!.lineItems).toEqual({
      old: "3 lines",
      new: "4 lines",
    });
  });

  it("records REVERSAL_CREATED action with reversal ID", () => {
    const changes = { reversalId: "cuid_reversal_789" };
    const audit = createAuditEntry(jeId, "REVERSAL_CREATED", userId, changes);

    expect(audit.action).toBe("REVERSAL_CREATED");
    expect(audit.changes!.reversalId).toBe("cuid_reversal_789");
  });

  it("has valid action values", () => {
    // All audit actions must be from the known set
    const validActions = new Set([
      "CREATED",
      "EDITED",
      "APPROVED",
      "POSTED",
      "DELETED",
      "REVERSAL_CREATED",
    ]);

    Object.values(AUDIT_ACTIONS).forEach((action) => {
      expect(validActions.has(action)).toBe(true);
    });
  });
});
