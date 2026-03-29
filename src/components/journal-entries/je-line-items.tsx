"use client";

import { useFieldArray, useWatch, useFormContext } from "react-hook-form";
import { useMemo } from "react";
import Decimal from "decimal.js";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountCombobox } from "./account-combobox";
import { JETotalsRow } from "./je-totals-row";
import type { JournalEntryFormInput } from "@/lib/validators/journal-entry";

type JELineItemsProps = {
  entityId: string;
  disabled?: boolean;
};

/**
 * Spreadsheet-style line item table for journal entries.
 * Uses react-hook-form useFieldArray for dynamic rows.
 * Live running totals computed with decimal.js.
 */
export function JELineItems({ entityId, disabled }: JELineItemsProps) {
  const { control, register, setValue } = useFormContext<JournalEntryFormInput>();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });

  const watchedLineItems = useWatch({
    control,
    name: "lineItems",
  });

  // Compute live totals with decimal.js
  const { totalDebit, totalCredit } = useMemo(() => {
    const items = watchedLineItems ?? [];
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    for (const item of items) {
      debit = debit.plus(new Decimal(item?.debit || "0"));
      credit = credit.plus(new Decimal(item?.credit || "0"));
    }
    return { totalDebit: debit, totalCredit: credit };
  }, [watchedLineItems]);

  const handleAddLine = () => {
    append({ accountId: "", debit: "0", credit: "0", memo: "" });
  };

  const handleDebitChange = (index: number, value: string) => {
    setValue(`lineItems.${index}.debit`, value, { shouldValidate: false });
    // Auto-clear credit when debit is entered (convenience)
    if (value && value !== "0") {
      const currentCredit = watchedLineItems?.[index]?.credit;
      if (currentCredit && currentCredit !== "0") {
        setValue(`lineItems.${index}.credit`, "0", { shouldValidate: false });
      }
    }
  };

  const handleCreditChange = (index: number, value: string) => {
    setValue(`lineItems.${index}.credit`, value, { shouldValidate: false });
    // Auto-clear debit when credit is entered (convenience)
    if (value && value !== "0") {
      const currentDebit = watchedLineItems?.[index]?.debit;
      if (currentDebit && currentDebit !== "0") {
        setValue(`lineItems.${index}.debit`, "0", { shouldValidate: false });
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Desktop table layout (sm and up) */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium w-[260px]">Account</th>
              <th className="px-3 py-2 text-right font-medium w-[130px]">Debit</th>
              <th className="px-3 py-2 text-right font-medium w-[130px]">Credit</th>
              <th className="px-3 py-2 text-left font-medium">Memo</th>
              <th className="px-3 py-2 w-[40px]" />
            </tr>
          </thead>
          <tbody>
            {fields.map((field, index) => (
              <tr key={field.id} className="border-b last:border-b-0">
                {/* Account */}
                <td className="px-2 py-1.5">
                  <AccountCombobox
                    value={watchedLineItems?.[index]?.accountId ?? ""}
                    onChange={(accountId) =>
                      setValue(`lineItems.${index}.accountId`, accountId, {
                        shouldValidate: false,
                      })
                    }
                    entityId={entityId}
                    disabled={disabled}
                  />
                </td>
                {/* Debit */}
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    {...register(`lineItems.${index}.debit`)}
                    onChange={(e) => handleDebitChange(index, e.target.value)}
                    disabled={disabled}
                    tabIndex={0}
                  />
                </td>
                {/* Credit */}
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    {...register(`lineItems.${index}.credit`)}
                    onChange={(e) => handleCreditChange(index, e.target.value)}
                    disabled={disabled}
                    tabIndex={0}
                  />
                </td>
                {/* Memo */}
                <td className="px-2 py-1.5">
                  <Input
                    className="h-8"
                    placeholder="Optional memo"
                    {...register(`lineItems.${index}.memo`)}
                    disabled={disabled}
                    tabIndex={0}
                  />
                </td>
                {/* Remove */}
                <td className="px-1 py-1.5 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => remove(index)}
                    disabled={disabled || fields.length <= 2}
                    aria-label="Remove line"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
            <JETotalsRow totalDebit={totalDebit} totalCredit={totalCredit} />
          </tbody>
        </table>
      </div>

      {/* Mobile card layout (below sm) */}
      <div className="sm:hidden space-y-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="rounded-lg border border-border p-3 space-y-3"
          >
            {/* Account - full width */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Account</span>
              <AccountCombobox
                value={watchedLineItems?.[index]?.accountId ?? ""}
                onChange={(accountId) =>
                  setValue(`lineItems.${index}.accountId`, accountId, {
                    shouldValidate: false,
                  })
                }
                entityId={entityId}
                disabled={disabled}
              />
            </div>
            {/* Debit / Credit side by side */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Debit</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  {...register(`lineItems.${index}.debit`)}
                  onChange={(e) => handleDebitChange(index, e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Credit</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="text-right font-mono h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  {...register(`lineItems.${index}.credit`)}
                  onChange={(e) => handleCreditChange(index, e.target.value)}
                  disabled={disabled}
                />
              </div>
            </div>
            {/* Memo - full width */}
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Memo</span>
              <Input
                className="h-8"
                placeholder="Optional memo"
                {...register(`lineItems.${index}.memo`)}
                disabled={disabled}
              />
            </div>
            {/* Remove button */}
            {!disabled && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 2}
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            )}
          </div>
        ))}
        {/* Mobile totals */}
        <div className="flex justify-between rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          <span>Totals</span>
          <div className="flex gap-4 font-mono">
            <span>Dr {totalDebit.toFixed(2)}</span>
            <span>Cr {totalCredit.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {!disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLine}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add Line
        </Button>
      )}
    </div>
  );
}

/**
 * Hook to compute whether the current JE form is balanced.
 * Used by JEForm to control button disabled state.
 */
export function useIsBalanced() {
  const { control } = useFormContext<JournalEntryFormInput>();
  const watchedLineItems = useWatch({ control, name: "lineItems" });

  return useMemo(() => {
    const items = watchedLineItems ?? [];
    let debit = new Decimal(0);
    let credit = new Decimal(0);
    for (const item of items) {
      debit = debit.plus(new Decimal(item?.debit || "0"));
      credit = credit.plus(new Decimal(item?.credit || "0"));
    }
    return debit.equals(credit) && !debit.isZero();
  }, [watchedLineItems]);
}
