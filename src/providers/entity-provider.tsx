"use client";

import { createContext, useContext } from "react";
import { useEntity, type EntityContextType } from "@/hooks/use-entity";

const EntityContext = createContext<EntityContextType | null>(null);

/**
 * Provider component that wraps children with entity selection context.
 * Must wrap all authenticated routes that need entity awareness.
 */
export function EntityProvider({ children }: { children: React.ReactNode }) {
  const entityState = useEntity();

  return (
    <EntityContext.Provider value={entityState}>
      {children}
    </EntityContext.Provider>
  );
}

/**
 * Hook to access entity context. Must be used within an EntityProvider.
 * @throws Error if used outside of EntityProvider
 */
export function useEntityContext(): EntityContextType {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error(
      "useEntityContext must be used within an EntityProvider"
    );
  }
  return context;
}
