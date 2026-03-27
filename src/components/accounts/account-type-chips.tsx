"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCOUNT_TYPES = [
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "EQUITY", label: "Equity" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
] as const;

type AccountTypeChipsProps = {
  activeTypes: Set<string>;
  onToggle: (type: string) => void;
};

/**
 * Row of toggle chips for filtering accounts by type.
 * Multi-select: each chip toggles independently.
 * Teal highlight when active.
 */
export function AccountTypeChips({ activeTypes, onToggle }: AccountTypeChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCOUNT_TYPES.map((type) => {
        const isActive = activeTypes.has(type.value);
        return (
          <Button
            key={type.value}
            variant={isActive ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(type.value)}
            className={cn(
              "h-7 rounded-full text-xs font-medium transition-colors",
              isActive && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {type.label}
          </Button>
        );
      })}
    </div>
  );
}
