"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X } from "lucide-react";
import Decimal from "decimal.js";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountCombobox } from "@/components/journal-entries/account-combobox";
import type { RecurringTemplate } from "./recurring-templates-table";

type EditLine = {
  key: string;
  accountId: string;
  debit: string;
  credit: string;
  memo: string;
};

type RecurringEditDialogProps = {
  template: RecurringTemplate | null;
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

let lineKeyCounter = 0;
function nextLineKey(): string {
  return `line-${++lineKeyCounter}`;
}

export function RecurringEditDialog({
  template,
  entityId,
  open,
  onOpenChange,
  onSaved,
}: RecurringEditDialogProps) {
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [nextRunDate, setNextRunDate] = useState("");
  const [lines, setLines] = useState<EditLine[]>([]);
  const [saving, setSaving] = useState(false);

  // Populate form when template changes
  useEffect(() => {
    if (template) {
      setName(template.name);
      setFrequency(template.frequency || "monthly");
      setNextRunDate(
        template.nextRunDate
          ? new Date(template.nextRunDate).toISOString().split("T")[0]
          : ""
      );
      setLines(
        template.lines.map((l) => ({
          key: nextLineKey(),
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          memo: l.memo,
        }))
      );
    }
  }, [template]);

  const { totalDebit, totalCredit } = useMemo(() => {
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    for (const line of lines) {
      debit = debit.plus(new Decimal(line.debit || "0"));
      credit = credit.plus(new Decimal(line.credit || "0"));
    }
    return { totalDebit: debit, totalCredit: credit };
  }, [lines]);

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: nextLineKey(), accountId: "", debit: "0", credit: "0", memo: "" },
    ]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof EditLine, value: string) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l))
    );
  }

  async function handleSave() {
    if (!template || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/templates/recurring`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateId: template.id,
            name: name.trim(),
            frequency,
            nextRunDate: nextRunDate || undefined,
            lines: lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit,
              credit: l.credit,
              memo: l.memo,
            })),
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Recurring template updated");
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(json.error ?? "Failed to update template");
      }
    } catch {
      toast.error("Failed to update template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recurring Template</DialogTitle>
          <DialogDescription>
            Update the schedule, name, and line items for this recurring entry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="rec-name">Name</Label>
            <Input
              id="rec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name"
            />
          </div>

          {/* Frequency */}
          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select value={frequency} onValueChange={(val) => val && setFrequency(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next Run Date */}
          <div className="space-y-2">
            <Label htmlFor="rec-next-date">Next Run Date</Label>
            <Input
              id="rec-next-date"
              type="date"
              value={nextRunDate}
              onChange={(e) => setNextRunDate(e.target.value)}
            />
          </div>

          {/* Template Lines */}
          <div className="space-y-2">
            <Label>Template Lines</Label>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium w-[220px]">
                      Account
                    </th>
                    <th className="px-3 py-2 text-right font-medium w-[110px]">
                      Debit
                    </th>
                    <th className="px-3 py-2 text-right font-medium w-[110px]">
                      Credit
                    </th>
                    <th className="px-3 py-2 text-left font-medium">Memo</th>
                    <th className="px-3 py-2 w-[40px]" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.key} className="border-b last:border-b-0">
                      <td className="px-2 py-1.5">
                        <AccountCombobox
                          value={line.accountId}
                          onChange={(accountId) =>
                            updateLine(index, "accountId", accountId)
                          }
                          entityId={entityId}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={line.debit}
                          onChange={(e) =>
                            updateLine(index, "debit", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          value={line.credit}
                          onChange={(e) =>
                            updateLine(index, "credit", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <Input
                          className="h-8"
                          placeholder="Optional memo"
                          value={line.memo}
                          onChange={(e) =>
                            updateLine(index, "memo", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-1 py-1.5 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeLine(index)}
                          disabled={lines.length <= 1}
                          aria-label="Remove line"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-muted/30 border-t">
                    <td className="px-3 py-2 text-right font-medium text-xs">
                      Totals
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                      {totalDebit.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs font-medium">
                      {totalCredit.toFixed(2)}
                    </td>
                    <td colSpan={2} className="px-3 py-2">
                      {!totalDebit.equals(totalCredit) && (
                        <span className="text-xs text-destructive">
                          Out of balance by{" "}
                          {totalDebit.minus(totalCredit).abs().toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Line
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim() || lines.length === 0}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
