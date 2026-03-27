"use client";

import { useState, useEffect, useCallback } from "react";
import type { SerializedEntity } from "@/types";

const STORAGE_KEY = "frontier-gl-entity";

export type EntityContextType = {
  currentEntityId: string;
  setCurrentEntityId: (id: string) => void;
  entities: SerializedEntity[];
  isLoading: boolean;
  refreshEntities: () => Promise<void>;
};

/**
 * Hook for managing entity selection state with localStorage persistence.
 *
 * - Default selection is "all" (consolidated view)
 * - Persists selection to localStorage key "frontier-gl-entity"
 * - Fetches entity list from /api/entities on mount
 * - Falls back to "all" if stored entity ID is not in active entities
 */
export function useEntity(): EntityContextType {
  const [currentEntityId, setCurrentEntityIdState] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(STORAGE_KEY) || "all";
  });
  const [entities, setEntities] = useState<SerializedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntities = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/entities");
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEntities(json.data);
          return json.data as SerializedEntity[];
        }
      }
    } catch {
      // Silently fail -- entities will be empty
    } finally {
      setIsLoading(false);
    }
    return [] as SerializedEntity[];
  }, []);

  const setCurrentEntityId = useCallback((id: string) => {
    setCurrentEntityIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  // Fetch entities on mount and validate stored selection
  useEffect(() => {
    fetchEntities().then((fetched) => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored !== "all") {
        const exists = fetched.some(
          (e: SerializedEntity) => e.id === stored && e.isActive
        );
        if (!exists) {
          setCurrentEntityIdState("all");
          localStorage.setItem(STORAGE_KEY, "all");
        }
      }
    });
  }, [fetchEntities]);

  return {
    currentEntityId,
    setCurrentEntityId,
    entities,
    isLoading,
    refreshEntities: async () => { await fetchEntities(); },
  };
}
