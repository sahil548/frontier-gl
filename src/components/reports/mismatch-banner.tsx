"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils/accounting";
import type { Mismatch } from "@/types/consolidated";

interface MismatchBannerProps {
  mismatches: Mismatch[];
}

export function MismatchBanner({ mismatches }: MismatchBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (mismatches.length === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 text-left"
      >
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
          {mismatches.length} intercompany mismatch{mismatches.length !== 1 ? "es" : ""}{" "}
          detected -- review eliminations
        </span>
        <span className="ml-auto">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          )}
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-1 pl-7">
          {mismatches.map((m, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm text-amber-700 dark:text-amber-300"
            >
              <span>{m.ruleLabel}</span>
              <span className="font-mono">
                {formatCurrency(Math.abs(m.difference))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
