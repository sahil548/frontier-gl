"use client";

import { useState } from "react";
import { useEntityContext } from "@/providers/entity-provider";
import { IncomeStatementView } from "@/components/reports/income-statement-view";
import { cn } from "@/lib/utils";

/**
 * Standalone Income Statement page at /reports/income-statement.
 * Renders the IncomeStatementView component with basis toggle.
 */
export default function IncomeStatementPage() {
  const {
    currentEntityId,
    entities,
    isLoading: entitiesLoading,
  } = useEntityContext();

  const [basis, setBasis] = useState<"accrual" | "cash">("accrual");

  const resolvedEntityId =
    currentEntityId === "all" && entities.length > 0
      ? entities[0].id
      : currentEntityId;

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Income Statement
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to view the income statement.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const entityName =
    currentEntityId === "all"
      ? "All Entities"
      : currentEntity?.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Income Statement
          </h1>
          <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
            {(["accrual", "cash"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBasis(b)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize",
                  basis === b
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {b === "accrual" ? "Accrual" : "Cash"}
              </button>
            ))}
          </div>
        </div>
        {entityName && (
          <p className="text-sm text-muted-foreground">{entityName}</p>
        )}
      </div>

      {resolvedEntityId && (
        <IncomeStatementView entityId={resolvedEntityId} basis={basis} />
      )}
    </div>
  );
}
