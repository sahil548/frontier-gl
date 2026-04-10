"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { SerializedEntity } from "@/types";
import type {
  ConsolidatedIncomeStatement,
  ConsolidatedBalanceSheet,
  ConsolidatedCashFlow,
} from "@/types/consolidated";

// ─── Types ──────────────────────────────────────────────

type ActiveTab = "income-statement" | "balance-sheet" | "cash-flow" | "budget-vs-actual";

interface UseConsolidatedReportParams {
  entities: SerializedEntity[];
  startDate: string;
  endDate: string;
  asOfDate: string;
  basis: "accrual" | "cash";
  activeTab: ActiveTab;
}

interface UseConsolidatedReportReturn {
  consolidatedIS: ConsolidatedIncomeStatement | null;
  consolidatedBS: ConsolidatedBalanceSheet | null;
  consolidatedCF: ConsolidatedCashFlow | null;
  loading: boolean;
  error: string | null;
  selectedEntityIds: Set<string>;
  toggleEntity: (entityId: string) => void;
  entities: { id: string; name: string; fiscalYearEnd: string }[];
}

// ─── Helpers ────────────────────────────────────────────

function toISODateString(date: string): string {
  return date;
}

// ─── Hook ───────────────────────────────────────────────

export function useConsolidatedReport({
  entities,
  startDate,
  endDate,
  asOfDate,
  basis,
  activeTab,
}: UseConsolidatedReportParams): UseConsolidatedReportReturn {
  const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(
    () => new Set(entities.map((e) => e.id))
  );
  const [consolidatedIS, setConsolidatedIS] =
    useState<ConsolidatedIncomeStatement | null>(null);
  const [consolidatedBS, setConsolidatedBS] =
    useState<ConsolidatedBalanceSheet | null>(null);
  const [consolidatedCF, setConsolidatedCF] =
    useState<ConsolidatedCashFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selectedEntityIds when entities list changes
  useEffect(() => {
    setSelectedEntityIds(new Set(entities.map((e) => e.id)));
  }, [entities]);

  const entityIdsParam = useMemo(
    () => Array.from(selectedEntityIds).join(","),
    [selectedEntityIds]
  );

  const toggleEntity = useCallback(
    (entityId: string) => {
      setSelectedEntityIds((prev) => {
        const next = new Set(prev);
        if (next.has(entityId)) {
          // Prevent deselecting all -- must keep at least 1
          if (next.size <= 1) return prev;
          next.delete(entityId);
        } else {
          next.add(entityId);
        }
        return next;
      });
    },
    []
  );

  // Fetch consolidated data based on active tab
  const fetchData = useCallback(async () => {
    if (selectedEntityIds.size === 0) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTab === "income-statement") {
        const params = new URLSearchParams({
          entityIds: entityIdsParam,
          startDate: toISODateString(startDate),
          endDate: toISODateString(endDate),
          basis,
        });
        const res = await fetch(
          `/api/consolidated/reports/income-statement?${params}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setConsolidatedIS(json.data);
          } else {
            setError(json.error ?? "Failed to fetch consolidated income statement");
          }
        } else {
          setError("Failed to fetch consolidated income statement");
        }
      } else if (activeTab === "balance-sheet") {
        const params = new URLSearchParams({
          entityIds: entityIdsParam,
          asOfDate: toISODateString(asOfDate),
          basis,
        });
        const res = await fetch(
          `/api/consolidated/reports/balance-sheet?${params}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setConsolidatedBS(json.data);
          } else {
            setError(json.error ?? "Failed to fetch consolidated balance sheet");
          }
        } else {
          setError("Failed to fetch consolidated balance sheet");
        }
      } else if (activeTab === "cash-flow") {
        const params = new URLSearchParams({
          entityIds: entityIdsParam,
          startDate: toISODateString(startDate),
          endDate: toISODateString(endDate),
        });
        const res = await fetch(
          `/api/consolidated/reports/cash-flow?${params}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setConsolidatedCF(json.data);
          } else {
            setError(json.error ?? "Failed to fetch consolidated cash flow");
          }
        } else {
          setError("Failed to fetch consolidated cash flow");
        }
      }
    } catch {
      setError("Network error fetching consolidated report");
    } finally {
      setLoading(false);
    }
  }, [activeTab, entityIdsParam, startDate, endDate, asOfDate, basis, selectedEntityIds.size]);

  useEffect(() => {
    if (
      activeTab === "income-statement" ||
      activeTab === "balance-sheet" ||
      activeTab === "cash-flow"
    ) {
      fetchData();
    }
  }, [fetchData, activeTab]);

  const entityInfo = useMemo(
    () =>
      entities.map((e) => ({
        id: e.id,
        name: e.name,
        fiscalYearEnd: e.fiscalYearEnd,
      })),
    [entities]
  );

  return {
    consolidatedIS,
    consolidatedBS,
    consolidatedCF,
    loading,
    error,
    selectedEntityIds,
    toggleEntity,
    entities: entityInfo,
  };
}
