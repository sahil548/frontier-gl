import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, fireEvent, waitFor, screen } from "@testing-library/react";

/**
 * Phase 14 Plan 02 — Manual JE Form Audit-Switch Regression
 *
 * Phase 14 changes the JE POST API default: omitting `status` causes the API
 * to auto-post when balanced. The wizard opening-balance helper relies on this
 * (omits `status`). The manual JE form, however, has its own draft → approve
 * → post UX (three buttons: Save Draft, Approve, Post). For the form, "Save"
 * must NEVER auto-post — it must always create a DRAFT.
 *
 * The post-Phase-14 audit-switch ensures the form fetch body explicitly sends
 * `status: "DRAFT"` so it stays opted out of the new POSTED-when-balanced
 * default. This test asserts that explicit opt-out is in place.
 *
 * Without `status: "DRAFT"`, clicking Save Draft on a balanced entry would
 * silently post the entry (regressing the form's UX contract).
 */

// Mock next/navigation since JEForm uses useRouter
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Stub child components that fetch their own data — this test focuses on the
// fetch body sent by Save Draft, not on full form behavior. JELineItems
// fetches accounts and dimensions on mount.
vi.mock("@/components/journal-entries/je-line-items", () => ({
  JELineItems: () => <div data-testid="line-items-stub" />,
  // Force balanced=true so the Save Draft button is not disabled by balance
  // check. The actual balance is enforced server-side anyway; this test
  // focuses on the fetch body shape.
  useIsBalanced: () => true,
}));

vi.mock("@/components/journal-entries/je-status-badge", () => ({
  JEStatusBadge: () => null,
}));

import { JEForm } from "@/components/journal-entries/je-form";

describe("Manual JE form preserves DRAFT-on-Save behavior post-Phase-14", () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = window.location;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { id: "je-1", status: "DRAFT" },
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    // Stub window.location.href setter so the form's hard-navigate after
    // save doesn't crash jsdom or unmount the component prematurely.
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.restoreAllMocks();
  });

  test("explicitly sends status: 'DRAFT' on Save Draft action", async () => {
    // Seed balanced line items via initialLines so zodResolver accepts
    // the form on submit (debit total === credit total, both lines have
    // a non-zero amount).
    render(
      <JEForm
        entityId="e1"
        mode="create"
        initialLines={[
          { accountId: "acct-cash", debit: "1000", credit: "0", memo: "Test debit" },
          { accountId: "acct-revenue", debit: "0", credit: "1000", memo: "Test credit" },
        ]}
      />
    );

    // Pre-fill the description (required by schema)
    const descInput = screen.getByLabelText(/description/i);
    fireEvent.change(descInput, { target: { value: "Test entry" } });

    const saveDraftBtn = screen.getByRole("button", { name: /save draft/i });
    fireEvent.click(saveDraftBtn);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled(), { timeout: 2000 });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);

    // The critical assertion: status MUST be "DRAFT" so the form opts out
    // of the new POSTED-when-balanced API default. Without this audit
    // switch (Phase 14 Plan 02 Task 3), Save Draft would silently auto-post.
    expect(body.status).toBe("DRAFT");
  });
});
