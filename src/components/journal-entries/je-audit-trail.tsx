"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

type AuditEntry = {
  id: string;
  action: string;
  userId: string;
  changes: unknown;
  createdAt: string;
};

type JEAuditTrailProps = {
  entries: AuditEntry[];
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: "Created",
  EDITED: "Edited",
  APPROVED: "Approved",
  POSTED: "Posted",
  REVERSAL_CREATED: "Reversal Created",
};

/**
 * Format a changes object into a readable summary.
 */
function formatChanges(changes: unknown): string | null {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, { old: string; new: string }>);
  if (entries.length === 0) return null;
  return entries
    .map(([key, val]) => `${key}: ${val.old} -> ${val.new}`)
    .join("; ");
}

/**
 * Timeline-style audit trail display for a journal entry.
 * Collapsible section below the JE form.
 */
export function JEAuditTrail({ entries }: JEAuditTrailProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entries.length === 0) return null;

  return (
    <div className="border rounded-lg">
      <Button
        type="button"
        variant="ghost"
        className="w-full justify-between px-4 py-3 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <Clock className="h-4 w-4" />
          Audit Trail ({entries.length} {entries.length === 1 ? "entry" : "entries"})
        </span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {entries.map((entry) => {
            const changesSummary = formatChanges(entry.changes);
            return (
              <div
                key={entry.id}
                className="flex items-start gap-3 text-sm border-l-2 border-border pl-3"
              >
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {ACTION_LABELS[entry.action] || entry.action}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {changesSummary && (
                    <p className="text-xs text-muted-foreground">
                      {changesSummary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
