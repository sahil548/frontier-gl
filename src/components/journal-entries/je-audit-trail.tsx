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
  RECURRING_GENERATED: "Generated from Recurring",
};

type FieldDiff = {
  field: string;
  old: string;
  new: string;
};

/**
 * Parse a changes object into structured field-level diffs.
 * Expects Record<string, { old: string; new: string }>
 */
function formatFieldDiffs(changes: unknown): FieldDiff[] | null {
  if (!changes || typeof changes !== "object") return null;
  const entries = Object.entries(changes as Record<string, { old: string; new: string }>);
  if (entries.length === 0) return null;
  return entries.map(([key, val]) => ({
    field: key,
    old: String(val.old ?? ""),
    new: String(val.new ?? ""),
  }));
}

/**
 * Format a changes object into a readable summary (backward compatibility).
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
 * Shows field-level diffs for EDITED actions with styled highlighting.
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
            const isEdited = entry.action === "EDITED";
            const diffs = isEdited ? formatFieldDiffs(entry.changes) : null;
            const changesSummary = !isEdited ? formatChanges(entry.changes) : null;

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
                  {/* Field-level diffs for EDITED actions */}
                  {diffs && diffs.length > 0 && (
                    <div className="text-xs space-y-0.5 mt-1">
                      {diffs.map((diff, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium text-muted-foreground">
                            {diff.field}:
                          </span>
                          <span className="line-through text-red-500/70">
                            {diff.old}
                          </span>
                          <span className="text-muted-foreground">&rarr;</span>
                          <span className="text-green-600">
                            {diff.new}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Non-EDITED fallback summary */}
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
