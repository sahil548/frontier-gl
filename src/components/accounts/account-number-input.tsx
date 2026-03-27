"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

type AccountNumberInputProps = {
  entityId: string;
  parentNumber?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Account number input with auto-suggest from the next-number API.
 * Shows suggestion as placeholder. User can accept or type custom number.
 * 5-digit format guidance shown below.
 */
export function AccountNumberInput({
  entityId,
  parentNumber,
  value,
  onChange,
  disabled,
}: AccountNumberInputProps) {
  const [suggestion, setSuggestion] = useState<string>("");

  useEffect(() => {
    if (!entityId || entityId === "all") return;

    const params = new URLSearchParams();
    if (parentNumber) {
      params.set("parentNumber", parentNumber);
    }

    fetch(`/api/entities/${entityId}/accounts/next-number?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.suggestedNumber) {
          setSuggestion(json.data.suggestedNumber);
          // Auto-fill if field is empty
          if (!value) {
            onChange(json.data.suggestedNumber);
          }
        }
      })
      .catch(() => {
        // Silently fail -- user can type manually
      });
    // Only re-fetch when entityId or parentNumber changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, parentNumber]);

  return (
    <div className="space-y-1">
      <Input
        type="text"
        inputMode="numeric"
        pattern="\d{1,5}"
        placeholder={suggestion || "e.g. 10000"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        5-digit format: 10000s Assets, 20000s Liabilities, 30000s Equity, 40000s
        Income, 50000s+ Expenses
      </p>
    </div>
  );
}
