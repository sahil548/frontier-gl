import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the holdings-to-positions migration script.
 *
 * Covers:
 * - Holdings without positions get a default position created
 * - Existing GL account is re-parented under a new summary account
 * - Holdings with existing positions get GL leaf accounts auto-created
 * - All holdings get a new summary GL account
 * - Account numbers use correct stepping (+100 for summary, +10 for positions)
 * - Legacy types (INVESTMENT, PRIVATE_EQUITY, RECEIVABLE) use backward-compat mapping
 * - Migration is idempotent (skips already-migrated holdings)
 */

// Mock Prisma client
const mockFindMany = vi.fn();
const mockFindFirst = vi.fn();
const mockFindUnique = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockAccountFindMany = vi.fn();
const mockAccountFindFirst = vi.fn();
const mockAccountFindUnique = vi.fn();
const mockAccountCreate = vi.fn();
const mockAccountUpdate = vi.fn();
const mockAccountBalanceCreate = vi.fn();
const mockPositionCreate = vi.fn();
const mockPositionUpdate = vi.fn();
const mockTransaction = vi.fn();

const mockTx = {
  subledgerItem: {
    findMany: mockFindMany,
    update: mockUpdate,
  },
  account: {
    findMany: mockAccountFindMany,
    findFirst: mockAccountFindFirst,
    findUnique: mockAccountFindUnique,
    create: mockAccountCreate,
    update: mockAccountUpdate,
  },
  accountBalance: {
    create: mockAccountBalanceCreate,
  },
  position: {
    create: mockPositionCreate,
    update: mockPositionUpdate,
  },
};

// We import the migration function that takes a prisma-like client
import { migrateHoldingsToPositionModel } from "@/scripts/migrate-holdings-positions";

describe("migrateHoldingsToPositionModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no siblings found (first child)
    mockAccountFindMany.mockResolvedValue([]);
    // Default: account balance creation succeeds
    mockAccountBalanceCreate.mockResolvedValue({});
  });

  it("creates a default position for holdings without positions", async () => {
    // Holding with no positions, existing GL account at 11100
    const holdings = [
      {
        id: "holding-1",
        entityId: "entity-1",
        accountId: "old-account-id",
        name: "Chase Operating",
        itemType: "BANK_ACCOUNT",
        isActive: true,
        account: { id: "old-account-id", number: "11100", parentId: "parent-11000" },
        positions: [],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);

    // Mock: type parent account exists (11000)
    mockAccountFindFirst.mockResolvedValue({ id: "parent-11000", number: "11000" });

    // Mock: summary account creation returns 11100
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-account-id",
      number: "11100",
      name: "Chase Operating",
      type: "ASSET",
      parentId: "parent-11000",
      entityId: "entity-1",
    });

    // Mock: position GL leaf account creation (re-parented old account stays, leaf created for position)
    // The existing account gets re-parented, so we update it
    mockAccountUpdate.mockResolvedValue({});

    // Mock: position creation
    mockPositionCreate.mockResolvedValue({
      id: "pos-1",
      name: "Cash",
      positionType: "CASH",
      accountId: "old-account-id",
      subledgerItemId: "holding-1",
    });

    // Mock: subledger item update
    mockUpdate.mockResolvedValue({});

    const result = await migrateHoldingsToPositionModel(mockTx as any);

    // Should create a default position with name "Cash" for BANK_ACCOUNT type
    expect(mockPositionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subledgerItemId: "holding-1",
        name: "Cash",
        positionType: "CASH",
        accountId: "old-account-id",
      }),
    });

    expect(result.defaultPositionsCreated).toBe(1);
  });

  it("re-parents existing GL account under new summary account for no-position holdings", async () => {
    const holdings = [
      {
        id: "holding-1",
        entityId: "entity-1",
        accountId: "old-account-id",
        name: "Chase Operating",
        itemType: "BANK_ACCOUNT",
        isActive: true,
        account: { id: "old-account-id", number: "11100", parentId: "parent-11000" },
        positions: [],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);
    mockAccountFindFirst.mockResolvedValue({ id: "parent-11000", number: "11000" });
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-account-id",
      number: "11100",
      name: "Chase Operating",
      type: "ASSET",
      parentId: "parent-11000",
      entityId: "entity-1",
    });
    mockAccountUpdate.mockResolvedValue({});
    mockPositionCreate.mockResolvedValue({ id: "pos-1" });
    mockUpdate.mockResolvedValue({});

    await migrateHoldingsToPositionModel(mockTx as any);

    // The old GL account should be re-parented to the new summary account
    expect(mockAccountUpdate).toHaveBeenCalledWith({
      where: { id: "old-account-id" },
      data: { parentId: "summary-account-id" },
    });

    // The holding's accountId should be updated to the summary account
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "holding-1" },
      data: { accountId: "summary-account-id" },
    });
  });

  it("creates GL leaf accounts for holdings with existing positions", async () => {
    const holdings = [
      {
        id: "holding-2",
        entityId: "entity-1",
        accountId: "old-account-id-2",
        name: "Schwab Brokerage",
        itemType: "BROKERAGE_ACCOUNT",
        isActive: true,
        account: { id: "old-account-id-2", number: "12100", parentId: "parent-12000" },
        positions: [
          { id: "pos-a", name: "AAPL", accountId: null, isActive: true },
          { id: "pos-b", name: "Cash", accountId: null, isActive: true },
        ],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);
    mockAccountFindFirst.mockResolvedValue({ id: "parent-12000", number: "12000" });

    // Summary account creation
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-brokerage-id",
      number: "12100",
      name: "Schwab Brokerage",
      type: "ASSET",
      parentId: "parent-12000",
      entityId: "entity-1",
    });

    // For createPositionGLAccount: need findUnique for summary account
    mockAccountFindUnique.mockResolvedValue({ id: "summary-brokerage-id", number: "12100" });

    // Position GL leaf accounts (called via createPositionGLAccount)
    mockAccountCreate
      .mockResolvedValueOnce({
        id: "leaf-aapl-id",
        number: "12110",
        name: "AAPL",
        type: "ASSET",
        parentId: "summary-brokerage-id",
        entityId: "entity-1",
      })
      .mockResolvedValueOnce({
        id: "leaf-cash-id",
        number: "12120",
        name: "Cash",
        type: "ASSET",
        parentId: "summary-brokerage-id",
        entityId: "entity-1",
      });

    // For the second position GL account, siblings query returns the first created account
    mockAccountFindMany
      .mockResolvedValueOnce([]) // siblings for summary account under type parent
      .mockResolvedValueOnce([]) // siblings for first position leaf
      .mockResolvedValueOnce([{ id: "leaf-aapl-id", number: "12110" }]); // siblings for second position leaf

    mockPositionUpdate.mockResolvedValue({});
    mockAccountUpdate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});

    const result = await migrateHoldingsToPositionModel(mockTx as any);

    // Each position should get its accountId updated to the created leaf account
    expect(mockPositionUpdate).toHaveBeenCalledTimes(2);
    expect(mockPositionUpdate).toHaveBeenCalledWith({
      where: { id: "pos-a" },
      data: { accountId: "leaf-aapl-id" },
    });
    expect(mockPositionUpdate).toHaveBeenCalledWith({
      where: { id: "pos-b" },
      data: { accountId: "leaf-cash-id" },
    });

    expect(result.withExistingPositions).toBe(1);
  });

  it("creates summary GL account under correct type parent for all holdings", async () => {
    const holdings = [
      {
        id: "holding-re",
        entityId: "entity-1",
        accountId: "old-re-account",
        name: "Beach House",
        itemType: "REAL_ESTATE",
        isActive: true,
        account: { id: "old-re-account", number: "16100", parentId: "parent-16000" },
        positions: [],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);
    mockAccountFindFirst.mockResolvedValue({ id: "parent-16000", number: "16000" });
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-re-id",
      number: "16100",
      name: "Beach House",
      type: "ASSET",
      parentId: "parent-16000",
      entityId: "entity-1",
    });
    mockAccountUpdate.mockResolvedValue({});
    mockPositionCreate.mockResolvedValue({ id: "pos-re" });
    mockUpdate.mockResolvedValue({});

    await migrateHoldingsToPositionModel(mockTx as any);

    // Summary account should be created under the 16000 parent (REAL_ESTATE)
    expect(mockAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        entityId: "entity-1",
        name: "Beach House",
        type: "ASSET",
        parentId: "parent-16000",
      }),
    });
  });

  it("uses correct account number stepping (+100 for summary, +10 for positions)", async () => {
    // Holding with existing positions under BROKERAGE type
    const holdings = [
      {
        id: "holding-3",
        entityId: "entity-1",
        accountId: "old-acct",
        name: "Fidelity",
        itemType: "BROKERAGE_ACCOUNT",
        isActive: true,
        account: { id: "old-acct", number: "12200", parentId: "parent-12000" },
        positions: [
          { id: "pos-x", name: "VXUS", accountId: null, isActive: true },
        ],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);
    mockAccountFindFirst.mockResolvedValue({ id: "parent-12000", number: "12000" });

    // Existing sibling at 12100 means next summary should be 12200
    mockAccountFindMany.mockResolvedValueOnce([{ id: "sib-1", number: "12100" }]);

    // Summary account at 12200
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-fidelity",
      number: "12200",
      name: "Fidelity",
      type: "ASSET",
      parentId: "parent-12000",
      entityId: "entity-1",
    });

    // For position GL leaf: findUnique for the summary account
    mockAccountFindUnique.mockResolvedValue({ id: "summary-fidelity", number: "12200" });

    // No siblings under the new summary
    mockAccountFindMany.mockResolvedValueOnce([]);

    // Position leaf at 12210 (12200 + 10)
    mockAccountCreate.mockResolvedValueOnce({
      id: "leaf-vxus",
      number: "12210",
      name: "VXUS",
      type: "ASSET",
      parentId: "summary-fidelity",
      entityId: "entity-1",
    });

    mockPositionUpdate.mockResolvedValue({});
    mockAccountUpdate.mockResolvedValue({});
    mockUpdate.mockResolvedValue({});

    await migrateHoldingsToPositionModel(mockTx as any);

    // Summary: should use +100 stepping from existing sibling (12100 + 100 = 12200)
    expect(mockAccountCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        number: "12200",
        parentId: "parent-12000",
      }),
    });

    // Position leaf: should use +10 stepping (12200 + 10 = 12210)
    expect(mockAccountCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        number: "12210",
        parentId: "summary-fidelity",
      }),
    });
  });

  it("handles legacy types using backward-compat mapping", async () => {
    // INVESTMENT maps to BROKERAGE_ACCOUNT prefix (12000)
    const holdings = [
      {
        id: "holding-legacy",
        entityId: "entity-1",
        accountId: "old-legacy-acct",
        name: "Old Investment Acct",
        itemType: "INVESTMENT",
        isActive: true,
        account: { id: "old-legacy-acct", number: "12100", parentId: "parent-12000" },
        positions: [],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);
    mockAccountFindFirst.mockResolvedValue({ id: "parent-12000", number: "12000" });
    mockAccountCreate.mockResolvedValueOnce({
      id: "summary-legacy",
      number: "12100",
      name: "Old Investment Acct",
      type: "ASSET",
      parentId: "parent-12000",
      entityId: "entity-1",
    });
    mockAccountUpdate.mockResolvedValue({});
    mockPositionCreate.mockResolvedValue({ id: "pos-legacy" });
    mockUpdate.mockResolvedValue({});

    await migrateHoldingsToPositionModel(mockTx as any);

    // Should use INVESTMENT's mapped prefix (12000 same as BROKERAGE_ACCOUNT)
    expect(mockAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "ASSET",
        parentId: "parent-12000",
      }),
    });

    // Default position for INVESTMENT should be "Cash"
    expect(mockPositionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Cash",
        positionType: "CASH",
      }),
    });
  });

  it("skips already-migrated holdings (idempotency)", async () => {
    // Holding with a position that already has an accountId set = already migrated
    const holdings = [
      {
        id: "holding-migrated",
        entityId: "entity-1",
        accountId: "summary-acct",
        name: "Already Migrated Bank",
        itemType: "BANK_ACCOUNT",
        isActive: true,
        account: { id: "summary-acct", number: "11100", parentId: "parent-11000" },
        positions: [
          { id: "pos-m", name: "Cash", accountId: "leaf-acct-id", isActive: true },
        ],
      },
    ];

    mockFindMany.mockResolvedValue(holdings);

    const result = await migrateHoldingsToPositionModel(mockTx as any);

    // No accounts should be created -- holding was already migrated
    expect(mockAccountCreate).not.toHaveBeenCalled();
    expect(mockPositionCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();

    expect(result.skipped).toBe(1);
    expect(result.migrated).toBe(0);
  });
});
