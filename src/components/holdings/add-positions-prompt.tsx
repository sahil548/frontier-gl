"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_POSITION_NAME,
  DEFAULT_POSITION_TYPE,
} from "@/lib/holdings/constants";
import {
  POSITION_TYPES,
  QUANTIFIABLE_TYPES,
} from "@/app/(auth)/holdings/page";

// ─── Types ──────────────────────────────────────────────

interface PositionRow {
  id: number;
  name: string;
  positionType: string;
  ticker: string;
  quantity: string;
  unitCost: string;
  marketValue: string;
}

interface AddPositionsPromptProps {
  entityId: string;
  holdingId: string;
  holdingName: string;
  holdingType: string;
  open: boolean;
  onClose: () => void;
  onPositionsAdded: () => void;
}

// ─── Component ──────────────────────────────────────────

let rowCounter = 0;

function makeDefaultRow(holdingType: string): PositionRow {
  rowCounter += 1;
  return {
    id: rowCounter,
    name: DEFAULT_POSITION_NAME[holdingType] ?? "General",
    positionType: DEFAULT_POSITION_TYPE[holdingType] ?? "OTHER",
    ticker: "",
    quantity: "",
    unitCost: "",
    marketValue: "",
  };
}

function makeEmptyRow(): PositionRow {
  rowCounter += 1;
  return {
    id: rowCounter,
    name: "",
    positionType: "OTHER",
    ticker: "",
    quantity: "",
    unitCost: "",
    marketValue: "",
  };
}

export function AddPositionsPrompt({
  entityId,
  holdingId,
  holdingName,
  holdingType,
  open,
  onClose,
  onPositionsAdded,
}: AddPositionsPromptProps) {
  const [rows, setRows] = useState<PositionRow[]>(() => [
    makeDefaultRow(holdingType),
  ]);
  const [saving, setSaving] = useState(false);

  function updateRow(id: number, field: keyof PositionRow, value: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  }

  function addRow() {
    setRows((prev) => [...prev, makeEmptyRow()]);
  }

  function removeRow(id: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  async function saveAll() {
    // Filter to rows with a name
    const validRows = rows.filter((r) => r.name.trim());
    if (validRows.length === 0) {
      toast.error("At least one position must have a name");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of validRows) {
      const isQuantifiable = QUANTIFIABLE_TYPES.has(row.positionType);
      const payload: Record<string, unknown> = {
        name: row.name.trim(),
        positionType: row.positionType,
        marketValue: parseFloat(row.marketValue) || 0,
      };
      if (row.ticker.trim()) payload.ticker = row.ticker.trim();
      if (isQuantifiable && row.quantity) payload.quantity = parseFloat(row.quantity);
      if (isQuantifiable && row.unitCost) payload.unitCost = parseFloat(row.unitCost);

      try {
        const res = await fetch(
          `/api/entities/${entityId}/subledger/${holdingId}/positions`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );
        const json = await res.json();
        if (res.ok && json.success) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setSaving(false);

    if (successCount > 0) {
      toast.success(
        `${successCount} position${successCount !== 1 ? "s" : ""} added`
      );
    }
    if (errorCount > 0) {
      toast.error(
        `${errorCount} position${errorCount !== 1 ? "s" : ""} failed to save`
      );
    }

    onPositionsAdded();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add Positions to {holdingName}</DialogTitle>
          <DialogDescription>
            Define positions within this holding. Each position gets its own GL
            account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {rows.map((row, idx) => {
            const isQuantifiable = QUANTIFIABLE_TYPES.has(row.positionType);
            return (
              <div
                key={row.id}
                className="rounded-md border p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Position {idx + 1}
                  </span>
                  {rows.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={row.name}
                      onChange={(e) =>
                        updateRow(row.id, "name", e.target.value)
                      }
                      placeholder="e.g., AAPL, Cash"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={row.positionType}
                      onValueChange={(v) =>
                        updateRow(row.id, "positionType", v ?? "OTHER")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POSITION_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Market Value</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={row.marketValue}
                      onChange={(e) =>
                        updateRow(row.id, "marketValue", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
                {isQuantifiable && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Ticker</Label>
                      <Input
                        value={row.ticker}
                        onChange={(e) =>
                          updateRow(row.id, "ticker", e.target.value)
                        }
                        placeholder="e.g., AAPL"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        step="any"
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(row.id, "quantity", e.target.value)
                        }
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Unit Cost</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={row.unitCost}
                        onChange={(e) =>
                          updateRow(row.id, "unitCost", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-3 w-3 mr-1" /> Add Row
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground underline"
            onClick={onClose}
          >
            Skip for now
          </button>
        </div>

        <DialogFooter>
          <Button
            onClick={saveAll}
            disabled={saving || rows.every((r) => !r.name.trim())}
          >
            {saving ? "Saving..." : "Save All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
