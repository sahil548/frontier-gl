import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import React from "react";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// We'll import after mocking
import { useEntity } from "@/hooks/use-entity";
import { EntityProvider, useEntityContext } from "@/providers/entity-provider";

const mockEntities = [
  {
    id: "entity-1",
    name: "Test LP",
    type: "LP",
    typeOther: null,
    fiscalYearEnd: "12-31",
    coaTemplate: "BLANK",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "entity-2",
    name: "Test Trust",
    type: "TRUST",
    typeOther: null,
    fiscalYearEnd: "12-31",
    coaTemplate: "BLANK",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("useEntity", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockEntities }),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("defaults currentEntityId to 'all'", () => {
    const { result } = renderHook(() => useEntity());
    expect(result.current.currentEntityId).toBe("all");
  });

  it("sets entity and persists to localStorage", async () => {
    const { result } = renderHook(() => useEntity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.setCurrentEntityId("entity-1");
    });

    expect(result.current.currentEntityId).toBe("entity-1");
    expect(localStorage.getItem("frontier-gl-entity")).toBe("entity-1");
  });

  it("reads from localStorage on mount", async () => {
    localStorage.setItem("frontier-gl-entity", "entity-2");

    const { result } = renderHook(() => useEntity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentEntityId).toBe("entity-2");
  });

  it("falls back to 'all' if stored entity ID is not in active entities", async () => {
    localStorage.setItem("frontier-gl-entity", "nonexistent-id");

    const { result } = renderHook(() => useEntity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentEntityId).toBe("all");
  });

  it("fetches entities from /api/entities on mount", async () => {
    const { result } = renderHook(() => useEntity());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/entities");
    expect(result.current.entities).toHaveLength(2);
    expect(result.current.entities[0].id).toBe("entity-1");
  });
});

describe("EntityProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: mockEntities }),
    });
  });

  it("throws if useEntityContext is used outside provider", () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useEntityContext());
    }).toThrow("useEntityContext must be used within an EntityProvider");

    spy.mockRestore();
  });

  it("provides entity context within provider", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(EntityProvider, null, children);

    const { result } = renderHook(() => useEntityContext(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.currentEntityId).toBe("all");
    expect(result.current.entities).toHaveLength(2);
  });
});
