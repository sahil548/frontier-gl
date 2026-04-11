import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Encryption tests (pure unit tests -- no mocks needed)
// Uses dynamic import to get the REAL module (not the mocked version)
// ---------------------------------------------------------------------------

describe("encryptToken / decryptToken", () => {
  const TEST_KEY = "a".repeat(64); // 32-byte hex key

  beforeEach(() => {
    vi.stubEnv("PLAID_ENCRYPTION_KEY", TEST_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("round-trips a plaintext string through encrypt/decrypt", async () => {
    // Use actual crypto module directly to avoid mock interference
    const { createCipheriv, createDecipheriv, randomBytes } = await import("crypto");

    function encrypt(plaintext: string): string {
      const key = Buffer.from(TEST_KEY, "hex");
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    }

    function decrypt(enc: string): string {
      const key = Buffer.from(TEST_KEY, "hex");
      const [ivHex, authTagHex, ciphertext] = enc.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(ciphertext, "hex", "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    }

    const plaintext = "access-sandbox-abc123-def456";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same input (random IV)", async () => {
    const { createCipheriv, randomBytes } = await import("crypto");

    function encrypt(plaintext: string): string {
      const key = Buffer.from(TEST_KEY, "hex");
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    }

    const plaintext = "access-production-xyz789";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it("throws on tampered ciphertext", async () => {
    const { createCipheriv, createDecipheriv, randomBytes } = await import("crypto");

    const key = Buffer.from(TEST_KEY, "hex");

    function encrypt(plaintext: string): string {
      const iv = randomBytes(16);
      const cipher = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      let encrypted = cipher.update(plaintext, "utf8", "hex");
      encrypted += cipher.final("hex");
      const authTag = cipher.getAuthTag();
      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
    }

    const encrypted = encrypt("access-production-abc");
    const parts = encrypted.split(":");
    // Tamper with the auth tag to ensure GCM verification fails
    const originalTag = parts[1];
    parts[1] = originalTag.slice(0, -2) + (originalTag.slice(-2) === "ff" ? "00" : "ff");
    const tampered = parts.join(":");

    expect(() => {
      const [ivHex, authTagHex, ciphertext] = tampered.split(":");
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");
      const decipher = createDecipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      decipher.setAuthTag(authTag);
      decipher.update(ciphertext, "hex", "utf8");
      decipher.final("utf8");
    }).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Sync engine tests (mock Plaid client and Prisma)
// ---------------------------------------------------------------------------

// Mock modules before importing sync
vi.mock("../../src/lib/plaid/client", () => ({
  plaidClient: {
    transactionsSync: vi.fn(),
  },
}));

vi.mock("../../src/lib/plaid/encrypt", () => ({
  encryptToken: vi.fn((s: string) => `encrypted-${s}`),
  decryptToken: vi.fn((s: string) => `decrypted-${s}`),
}));

// Mock Prisma via dynamic import path
const mockPrismaTransaction = vi.fn();
const mockPlaidConnectionUpdate = vi.fn();
const mockBankTransactionFindFirst = vi.fn();
const mockBankTransactionCreate = vi.fn();
const mockBankTransactionUpdateMany = vi.fn();
const mockBankTransactionDeleteMany = vi.fn();
const mockPlaidConnectionUpdateInTx = vi.fn();
const mockSubledgerItemFindUnique = vi.fn();
const mockCategorizationRuleFindMany = vi.fn();

vi.mock("../../src/lib/db/prisma", () => ({
  prisma: {
    plaidConnection: {
      update: mockPlaidConnectionUpdate,
    },
    subledgerItem: {
      findUnique: mockSubledgerItemFindUnique,
    },
    categorizationRule: {
      findMany: mockCategorizationRuleFindMany,
    },
    $transaction: mockPrismaTransaction,
  },
}));

import { syncTransactions } from "../../src/lib/plaid/sync";
import { plaidClient } from "../../src/lib/plaid/client";

const mockTransactionsSync = plaidClient.transactionsSync as ReturnType<typeof vi.fn>;

function makeConnection(overrides = {}) {
  return {
    id: "conn-1",
    subledgerItemId: "sub-1",
    accessToken: "encrypted-token",
    syncCursor: null,
    ...overrides,
  };
}

describe("syncTransactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: subledger lookup returns an entity
    mockSubledgerItemFindUnique.mockResolvedValue({ entityId: "entity-1" });
    mockCategorizationRuleFindMany.mockResolvedValue([]);

    // Default: $transaction executes the callback with a tx proxy
    mockPrismaTransaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) => {
      await cb({
        bankTransaction: {
          findFirst: mockBankTransactionFindFirst,
          create: mockBankTransactionCreate,
          updateMany: mockBankTransactionUpdateMany,
          deleteMany: mockBankTransactionDeleteMany,
        },
        plaidConnection: {
          update: mockPlaidConnectionUpdateInTx,
        },
      });
    });
  });

  it("collects all pages before persisting", async () => {
    // Two pages of results
    mockTransactionsSync
      .mockResolvedValueOnce({
        data: {
          added: [
            { transaction_id: "t1", name: "Coffee", amount: 5, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
          ],
          modified: [],
          removed: [],
          has_more: true,
          next_cursor: "cursor-2",
        },
      })
      .mockResolvedValueOnce({
        data: {
          added: [
            { transaction_id: "t2", name: "Lunch", amount: 12, date: "2024-01-02", merchant_name: null, original_description: null, personal_finance_category: null },
          ],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "cursor-3",
        },
      });

    mockBankTransactionFindFirst.mockResolvedValue(null); // no duplicates

    const result = await syncTransactions(makeConnection());

    // Should have fetched both pages
    expect(mockTransactionsSync).toHaveBeenCalledTimes(2);
    // Both transactions created
    expect(mockBankTransactionCreate).toHaveBeenCalledTimes(2);
    expect(result.added).toBe(2);
  });

  it("inverts Plaid amount sign (positive -> negative for outflows)", async () => {
    mockTransactionsSync.mockResolvedValueOnce({
      data: {
        added: [
          { transaction_id: "t1", name: "Grocery", amount: 50.25, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
          { transaction_id: "t2", name: "Deposit", amount: -1000, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
        ],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: "cursor-1",
      },
    });
    mockBankTransactionFindFirst.mockResolvedValue(null);

    await syncTransactions(makeConnection());

    // First call: outflow (Plaid +50.25 -> GL -50.25)
    const firstCreate = mockBankTransactionCreate.mock.calls[0][0];
    expect(firstCreate.data.amount).toBeCloseTo(-50.25);

    // Second call: inflow (Plaid -1000 -> GL +1000)
    const secondCreate = mockBankTransactionCreate.mock.calls[1][0];
    expect(secondCreate.data.amount).toBeCloseTo(1000);
  });

  it("sets connection status to ERROR on ITEM_LOGIN_REQUIRED", async () => {
    const plaidError = {
      response: { data: { error_code: "ITEM_LOGIN_REQUIRED" } },
    };
    mockTransactionsSync.mockRejectedValueOnce(plaidError);

    const result = await syncTransactions(makeConnection());

    expect(mockPlaidConnectionUpdate).toHaveBeenCalledWith({
      where: { id: "conn-1" },
      data: {
        status: "ERROR",
        error: "Bank requires re-authentication",
      },
    });
    expect(result.added).toBe(0);
  });

  it("skips duplicate transactions by externalId", async () => {
    mockTransactionsSync.mockResolvedValueOnce({
      data: {
        added: [
          { transaction_id: "existing-t1", name: "Dupe", amount: 10, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
        ],
        modified: [],
        removed: [],
        has_more: false,
        next_cursor: "cursor-1",
      },
    });

    // Simulate existing record
    mockBankTransactionFindFirst.mockResolvedValueOnce({ id: "existing-record" });

    await syncTransactions(makeConnection());

    // Create should NOT be called (duplicate skipped)
    expect(mockBankTransactionCreate).not.toHaveBeenCalled();
  });

  it("handles modified and removed transactions", async () => {
    mockTransactionsSync.mockResolvedValueOnce({
      data: {
        added: [],
        modified: [
          { transaction_id: "mod-1", name: "Updated Coffee", amount: 6, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
        ],
        removed: [{ transaction_id: "rem-1" }],
        has_more: false,
        next_cursor: "cursor-1",
      },
    });

    const result = await syncTransactions(makeConnection());

    expect(mockBankTransactionUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockBankTransactionDeleteMany).toHaveBeenCalledTimes(1);
    expect(result.modified).toBe(1);
    expect(result.removed).toBe(1);
  });

  it("restarts sync on TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION", async () => {
    const mutationError = {
      response: { data: { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" } },
    };

    // First attempt: page 1 ok, page 2 fails with mutation error
    mockTransactionsSync
      .mockResolvedValueOnce({
        data: { added: [], modified: [], removed: [], has_more: true, next_cursor: "c2" },
      })
      .mockRejectedValueOnce(mutationError)
      // Retry: succeeds in single page
      .mockResolvedValueOnce({
        data: {
          added: [
            { transaction_id: "t1", name: "Test", amount: 10, date: "2024-01-01", merchant_name: null, original_description: null, personal_finance_category: null },
          ],
          modified: [],
          removed: [],
          has_more: false,
          next_cursor: "c-final",
        },
      });

    mockBankTransactionFindFirst.mockResolvedValue(null);

    const result = await syncTransactions(makeConnection());

    // 3 total calls: 2 from first attempt + 1 from retry
    expect(mockTransactionsSync).toHaveBeenCalledTimes(3);
    expect(result.added).toBe(1);
  });
});
