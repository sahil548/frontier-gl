"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountCombobox } from "@/components/ui/account-combobox";
import { cn } from "@/lib/utils";
import type { SerializedBankTransaction } from "./transaction-table";

// ---- Types ----------------------------------------------------------------

type AccountOption = {
  id: string;
  accountNumber: string;
  name: string;
};

type SplitLine = {
  accountId: string;
  amount: string;
  memo: string;
};

type SplitDialogProps = {
  transaction: SerializedBankTransaction | null;
  accounts: AccountOption[];
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

function emptyLine(): SplitLine {
  return { accountId: "", amount: "", memo: "" };
}

// ---- Component ------------------------------------------------------------

export function SplitDialog({
  transaction,
  accounts,
  entityId,
  open,
  onOpenChange,
  onSuccess,
}: SplitDialogProps) {
  const [lines, setLines] = useState<SplitLine[]>([emptyLine(), emptyLine()]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const originalAmount = transaction
    ? Math.abs(parseFloat(transaction.amount))
    : 0;

  const currentSum = useMemo(
    () =>
      lines.reduce((sum, l) => {
        const val = parseFloat(l.amount);
        return sum + (isNaN(val) ? 0 : val);
      }, 0),
    [lines]
  );

  const remainder = originalAmount - currentSum;
  const isBalanced = Math.abs(remainder) < 0.005;

  const updateLine = (index: number, field: keyof SplitLine, value: string) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 2) return; // Must have at least 2 lines
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const autoFillLast = () => {
    if (lines.length < 2) return;
    const sumExceptLast = lines.slice(0, -1).reduce((sum, l) => {
      const val = parseFloat(l.amount);
      return sum + (isNaN(val) ? 0 : val);
    }, 0);
    const lastAmount = Math.max(0, originalAmount - sumExceptLast);
    setLines((prev) => {
      const next = [...prev];
      next[next.length - 1] = {
        ...next[next.length - 1],
        amount: lastAmount.toFixed(2),
      };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!transaction) return;

    // Validate all lines have accounts and amounts
    const invalidLines = lines.filter(
      (l) => !l.accountId || !l.amount || parseFloat(l.amount) <= 0
    );
    if (invalidLines.length > 0) {
      toast.error("All split lines must have an account and a positive amount");
      return;
    }

    if (!isBalanced) {
      toast.error(
        `Split amounts must equal the transaction amount ($${originalAmount.toFixed(2)})`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/${transaction.id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postImmediately: true,
            splits: lines.map((l) => ({
              accountId: l.accountId,
              amount: parseFloat(l.amount),
              memo: l.memo || undefined,
            })),
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        toast.success("Transaction split and posted as journal entry");
        onOpenChange(false);
        setLines([emptyLine(), emptyLine()]);
        onSuccess();
      } else {
        toast.error(json.error || "Failed to split transaction");
      }
    } catch {
      toast.error("Failed to split transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset lines when dialog opens with a new transaction
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setLines([emptyLine(), emptyLine()]);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Transaction</DialogTitle>
          <DialogDescription>
            Split this transaction across multiple GL accounts. The total must
            equal the original amount.
          </DialogDescription>
        </DialogHeader>

        {transaction && (
          <div className="space-y-4">
            {/* Original transaction summary */}
            <div className="rounded-lg border bg-muted/50 p-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{transaction.description}</span>
                <span className="font-mono font-semibold">
                  ${originalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Split lines */}
            <div className="space-y-3">
              {lines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Account
                    </Label>
                    <AccountCombobox
                      accounts={accounts}
                      value={line.accountId || null}
                      onSelect={(id) => updateLine(idx, "accountId", id)}
                      placeholder="Select account..."
                    />
                  </div>
                  <div className="w-[100px]">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Amount
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.amount}
                      onChange={(e) => updateLine(idx, "amount", e.target.value)}
                      placeholder="0.00"
                      className="font-mono"
                    />
                  </div>
                  <div className="w-[100px]">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      Memo
                    </Label>
                    <Input
                      value={line.memo}
                      onChange={(e) => updateLine(idx, "memo", e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="pt-5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length <= 2}
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add line + Auto-fill */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add Line
              </Button>
              <Button variant="ghost" size="sm" onClick={autoFillLast}>
                Auto-fill last line
              </Button>
            </div>

            {/* Running total */}
            <div
              className={cn(
                "flex justify-between rounded-lg border p-3 text-sm font-medium",
                isBalanced
                  ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
                  : "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-300"
              )}
            >
              <span>
                Total: ${currentSum.toFixed(2)} / ${originalAmount.toFixed(2)}
              </span>
              <span>
                {isBalanced
                  ? "Balanced"
                  : `Remainder: $${Math.abs(remainder).toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !isBalanced}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              "Split & Post"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
