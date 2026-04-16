"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

/**
 * Valid roles per import type for display labels.
 */
const ROLE_LABELS: Record<string, Record<string, string>> = {
  bank: {
    date: "Date",
    description: "Description",
    amount: "Amount",
    debit: "Debit",
    credit: "Credit",
    reference: "Reference",
    // Phase 12-09: optional per-row account routing. When mapped, the bank
    // feed page switches from single-account to multi-account (per-row) mode.
    account: "Account (optional)",
  },
  coa: {
    accountNumber: "Account Number",
    accountName: "Account Name",
    accountType: "Account Type",
    description: "Description",
    parentNumber: "Parent Number",
  },
  budget: {
    accountNumber: "Account Number",
    month: "Month",
    year: "Year",
    amount: "Amount",
  },
};

export interface ColumnMappingUIProps {
  headers: string[];
  sampleRows: string[][];
  importType: "bank" | "coa" | "budget";
  entityId: string;
  initialMapping?: Record<string, string>;
  onConfirm: (mapping: Record<string, string>, sourceName: string) => void;
  onCancel: () => void;
}

export function ColumnMappingUI({
  headers,
  sampleRows,
  importType,
  entityId,
  initialMapping,
  onConfirm,
  onCancel,
}: ColumnMappingUIProps) {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [sourceName, setSourceName] = useState("");
  const [source, setSource] = useState<"saved" | "llm" | "heuristic" | "manual">("manual");
  const [loading, setLoading] = useState(!initialMapping);
  const [saving, setSaving] = useState(false);

  const roleLabels = ROLE_LABELS[importType] ?? {};

  // Fetch mapping from API if no initial mapping provided
  useEffect(() => {
    if (initialMapping) {
      setMapping(initialMapping);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchMapping() {
      try {
        const res = await fetch(`/api/entities/${entityId}/csv-column-map`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            sampleRows: sampleRows.slice(0, 3),
            importType,
          }),
        });

        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setMapping(json.data.mapping || {});
            setSource(json.data.source || "heuristic");
            // When a saved mapping matched (either by explicit sourceName
            // or via header fingerprint), pre-fill the sourceName field so
            // the user can see which saved mapping is being reused.
            if (json.data.source === "saved" && json.data.sourceName) {
              setSourceName(json.data.sourceName);
            }
          }
        }
      } catch {
        // Silently fall back to empty mapping (user can manually adjust)
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMapping();
    return () => { cancelled = true; };
  }, [headers, sampleRows, importType, entityId, initialMapping]);

  const handleRoleChange = (role: string, header: string) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (header === "__none__") {
        delete next[role];
      } else {
        next[role] = header;
      }
      return next;
    });
    setSource("manual");
  };

  const handleConfirm = async () => {
    // Save mapping if source name is provided
    if (sourceName.trim()) {
      setSaving(true);
      try {
        await fetch(`/api/entities/${entityId}/column-mappings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceName: sourceName.trim(),
            importType,
            mapping,
          }),
        });
      } catch {
        toast.error("Failed to save mapping for future use");
      } finally {
        setSaving(false);
      }
    }

    onConfirm(mapping, sourceName.trim());
  };

  const sourceLabel =
    source === "saved"
      ? "Saved"
      : source === "llm"
        ? "AI-detected"
        : source === "heuristic"
          ? "Auto-detected"
          : "Manual";

  const sourceVariant =
    source === "saved"
      ? "default"
      : source === "llm"
        ? "secondary"
        : "outline";

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2 py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Detecting column mappings...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Column Mapping</h3>
        <Badge variant={sourceVariant}>{sourceLabel}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Review and adjust how CSV columns map to data fields. Change any
        mapping that looks incorrect.
      </p>

      {/* Phase 12-09: multi-account mode indicator */}
      {importType === "bank" && mapping.account && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Multi-account mode:</span>{" "}
          rows will route per the Account column. The bank-account selector
          above is ignored for this import.
        </p>
      )}

      {/* Mapping table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-40">Field</th>
              <th className="px-3 py-2 text-left font-medium">CSV Column</th>
              <th className="px-3 py-2 text-left font-medium">Sample Values</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(roleLabels).map(([role, label]) => {
              const selectedHeader = mapping[role] ?? "";
              const headerIdx = headers.indexOf(selectedHeader);
              const samples = headerIdx >= 0
                ? sampleRows.slice(0, 3).map((row) => row[headerIdx] ?? "").join(", ")
                : "";

              return (
                <tr key={role} className="border-b">
                  <td className="px-3 py-2 font-medium">{label}</td>
                  <td className="px-3 py-2">
                    <Select
                      value={selectedHeader || "__none__"}
                      onValueChange={(val) => handleRoleChange(role, val ?? "__none__")}
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">-- Not mapped --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground text-xs font-mono truncate max-w-48">
                    {samples || "--"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Source name for saving */}
      <div className="space-y-1.5">
        <Label htmlFor="source-name" className="text-sm">
          Source name (optional)
        </Label>
        <Input
          id="source-name"
          placeholder='e.g., "Chase Checking", "Schwab Brokerage"'
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          className="max-w-sm"
        />
        <p className="text-xs text-muted-foreground">
          Save this mapping for future imports from the same source.
        </p>
      </div>

      {/* Preview table */}
      {sampleRows.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Preview CSV data ({sampleRows.length} rows)
          </summary>
          <div className="mt-2 rounded-md border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/50">
                  {headers.map((h, i) => (
                    <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b">
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 whitespace-nowrap">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleConfirm} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Confirm & Import"
          )}
        </Button>
      </div>
    </Card>
  );
}
