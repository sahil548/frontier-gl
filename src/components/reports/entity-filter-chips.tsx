"use client";

import { cn } from "@/lib/utils";

interface EntityFilterChipsProps {
  entities: { id: string; name: string; fiscalYearEnd: string }[];
  selectedIds: Set<string>;
  onToggle: (entityId: string) => void;
}

function formatFiscalYearEnd(fiscalYearEnd: string): string {
  // fiscalYearEnd is stored as "YYYY-MM-DD" or "MM-DD" -- extract month/day
  const parts = fiscalYearEnd.split("-");
  const month = parseInt(parts.length >= 3 ? parts[1] : parts[0], 10);
  const day = parseInt(parts.length >= 3 ? parts[2] : parts[1], 10);
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${monthNames[month - 1]} ${day}`;
}

export function EntityFilterChips({
  entities,
  selectedIds,
  onToggle,
}: EntityFilterChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {entities.map((entity) => {
        const isSelected = selectedIds.has(entity.id);
        const isOnlySelected = isSelected && selectedIds.size === 1;

        return (
          <button
            key={entity.id}
            onClick={() => onToggle(entity.id)}
            disabled={isOnlySelected}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground",
              isOnlySelected && "opacity-60 cursor-not-allowed",
              !isOnlySelected && "cursor-pointer hover:opacity-80"
            )}
          >
            {entity.name}
            <span className="text-xs opacity-70">
              ({formatFiscalYearEnd(entity.fiscalYearEnd)})
            </span>
          </button>
        );
      })}
    </div>
  );
}
