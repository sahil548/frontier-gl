import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { generateOpeningBalanceJE } from "@/lib/onboarding/opening-balance";

/**
 * WIZ-03 Regression: wizard opening-balance JE auto-posts.
 *
 * Phase 14 Plan 02 changes the JE POST API contract: the optional `status`
 * field, when omitted, makes the API auto-post when the JE is balanced.
 *
 * The wizard's opening-balance helper relies on this default — it deliberately
 * omits `status` from the POST body so that a balanced opening-balance JE flips
 * straight to POSTED (no manual approve+post step), and the user lands on the
 * Balance Sheet with the entered values immediately visible.
 *
 * If a future change adds `status: "DRAFT"` to this fetch body, the wizard
 * regresses to the pre-Phase-14 behavior (Balance Sheet shows nothing until
 * the user manually posts the JE). This test guards against that regression.
 */
describe("WIZ-03: wizard opening-balance JE auto-posts (omits status)", () => {
  const originalFetch = globalThis.fetch;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          success: true,
          data: { id: "je-123", status: "POSTED" },
        }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  test("does NOT send status field in POST body — relies on POSTED-when-balanced default", async () => {
    // Build a minimal balanced grid: 1000 debit on acct1, 1000 credit on acct2
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "1000");
    grid.set("acct2-credit", "1000");

    await generateOpeningBalanceJE("entity-123", grid, "2026-01-01");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);

    // Critical assertion: NO status field in body. The API defaults to
    // POSTED-when-balanced (post-Phase-14). Adding `status: "DRAFT"` here
    // would silently regress the wizard to the pre-Phase-14 manual-post UX.
    expect(body).not.toHaveProperty("status");

    // Sanity assertions that confirm the helper still constructs a valid JE:
    expect(body.lineItems.length).toBeGreaterThanOrEqual(2);
    expect(body.description).toBe("Opening Balances");
    expect(body.date).toBe("2026-01-01");
  });

  test("POST body shape: lineItems include accountId, debit, credit, memo (no status leakage to lines)", async () => {
    const grid = new Map<string, string>();
    grid.set("acct1-debit", "500");
    grid.set("acct2-credit", "500");

    await generateOpeningBalanceJE("entity-123", grid, "2026-01-01");

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body as string);

    // Each line item must NOT carry a top-level `status` either.
    for (const line of body.lineItems) {
      expect(line).toHaveProperty("accountId");
      expect(line).toHaveProperty("debit");
      expect(line).toHaveProperty("credit");
      expect(line).toHaveProperty("memo");
      expect(line).not.toHaveProperty("status");
    }
  });
});
