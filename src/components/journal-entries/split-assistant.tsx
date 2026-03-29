"use client";

import { useState, useMemo } from "react";
import Decimal from "decimal.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

type SplitAssistantProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lineIndex: number;
  currentLine: {
    debit: string;
    credit: string;
  };
  dimensionName: string;
  onSplit: (lineIndex: number, percentage: number) => void;
};

/**
 * Dialog to split a JE line item into two proportional lines.
 * Used when a user needs to allocate one amount across two dimension tags.
 * Uses Decimal.js for precise proportional calculation.
 */
export function SplitAssistant({
  open,
  onOpenChange,
  lineIndex,
  currentLine,
  dimensionName,
  onSplit,
}: SplitAssistantProps) {
  const [percentage, setPercentage] = useState("50");

  const preview = useMemo(() => {
    const pct = new Decimal(percentage || "0").div(100);
    const debit = new Decimal(currentLine.debit || "0");
    const credit = new Decimal(currentLine.credit || "0");

    const line1Debit = debit.mul(pct).toDecimalPlaces(4);
    const line1Credit = credit.mul(pct).toDecimalPlaces(4);
    const line2Debit = debit.minus(line1Debit);
    const line2Credit = credit.minus(line1Credit);

    return {
      line1: { debit: line1Debit.toFixed(2), credit: line1Credit.toFixed(2) },
      line2: { debit: line2Debit.toFixed(2), credit: line2Credit.toFixed(2) },
    };
  }, [percentage, currentLine]);

  const handleConfirm = () => {
    const pct = parseFloat(percentage || "0");
    if (pct > 0 && pct < 100) {
      onSplit(lineIndex, pct);
      onOpenChange(false);
      setPercentage("50");
    }
  };

  const pctNum = parseFloat(percentage || "0");
  const isValid = pctNum > 0 && pctNum < 100;

  const amount = new Decimal(currentLine.debit || "0").isZero()
    ? currentLine.credit
    : currentLine.debit;
  const amountLabel = new Decimal(currentLine.debit || "0").isZero()
    ? "Credit"
    : "Debit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Split Line for {dimensionName}</DialogTitle>
          <DialogDescription>
            Split line {lineIndex + 1} into two lines for different{" "}
            {dimensionName} tags. Enter the percentage for the first line.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">
            Current {amountLabel}: <span className="font-mono font-medium text-foreground">${amount}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="split-pct">Line 1 percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="split-pct"
                type="number"
                min="1"
                max="99"
                step="1"
                value={percentage}
                onChange={(e) => setPercentage(e.target.value)}
                className="w-24 text-right font-mono"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>

          {isValid && (
            <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Line 1 ({percentage}%)</span>
                <span className="font-mono">
                  {amountLabel === "Debit" ? preview.line1.debit : preview.line1.credit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Line 2 ({(100 - pctNum).toFixed(0)}%)
                </span>
                <span className="font-mono">
                  {amountLabel === "Debit" ? preview.line2.debit : preview.line2.credit}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Split Line
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
