"use client";

import { useFieldArray, useWatch, useFormContext } from "react-hook-form";
import { useState, useEffect, useMemo, useCallback } from "react";
import Decimal from "decimal.js";
import { Plus, X, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountCombobox } from "./account-combobox";
import { DimensionCombobox } from "./dimension-combobox";
import { SplitAssistant } from "./split-assistant";
import { JETotalsRow } from "./je-totals-row";
import type { JournalEntryFormInput } from "@/lib/validators/journal-entry";

type AccountOption = {
  id: string;
  number: string;
  name: string;
  type: string;
  parentId: string | null;
  isActive: boolean;
};

type Dimension = {
  id: string;
  name: string;
  isActive: boolean;
  tags: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  }>;
};

type JELineItemsProps = {
  entityId: string;
  disabled?: boolean;
  /** Map of accountId → display label for instant rendering before accounts load */
  accountLabels?: Record<string, string>;
};

/**
 * Spreadsheet-style line item table for journal entries.
 * Uses react-hook-form useFieldArray for dynamic rows.
 * Live running totals computed with decimal.js.
 * Renders dynamic dimension combobox columns for each active dimension.
 */
export function JELineItems({ entityId, disabled, accountLabels }: JELineItemsProps) {
  const { control, register, setValue } = useFormContext<JournalEntryFormInput>();
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [splitState, setSplitState] = useState<{
    open: boolean;
    lineIndex: number;
    dimensionName: string;
  }>({ open: false, lineIndex: 0, dimensionName: "" });

  const { fields, append, remove, insert } = useFieldArray({
    control,
    name: "lineItems",
  });

  const watchedLineItems = useWatch({
    control,
    name: "lineItems",
  });

  // Fetch accounts and dimensions in parallel on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      const [accountsRes, dimensionsRes] = await Promise.allSettled([
        fetch(`/api/entities/${entityId}/accounts`),
        fetch(`/api/entities/${entityId}/dimensions`),
      ]);

      if (cancelled) return;

      if (accountsRes.status === "fulfilled" && accountsRes.value.ok) {
        const json = await accountsRes.value.json();
        if (json.success && !cancelled) {
          setAccounts(json.data as AccountOption[]);
        }
      }

      if (dimensionsRes.status === "fulfilled" && dimensionsRes.value.ok) {
        const json = await dimensionsRes.value.json();
        if (json.success && !cancelled) {
          const active = (json.data as Dimension[]).filter((d) => d.isActive);
          setDimensions(active);
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

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
    append({ accountId: "", debit: "0", credit: "0", memo: "", dimensionTags: {} });
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

  const handleDimensionTagChange = useCallback(
    (lineIndex: number, dimensionId: string, tagId: string) => {
      setValue(
        `lineItems.${lineIndex}.dimensionTags.${dimensionId}`,
        tagId,
        { shouldValidate: false }
      );
    },
    [setValue]
  );

  const handleSplit = useCallback(
    (lineIndex: number, percentage: number) => {
      const line = watchedLineItems?.[lineIndex];
      if (!line) return;

      const pct = new Decimal(percentage).div(100);
      const debit = new Decimal(line.debit || "0");
      const credit = new Decimal(line.credit || "0");

      const line1Debit = debit.mul(pct).toDecimalPlaces(4);
      const line1Credit = credit.mul(pct).toDecimalPlaces(4);
      const line2Debit = debit.minus(line1Debit);
      const line2Credit = credit.minus(line1Credit);

      // Update current line with line1 amounts
      setValue(`lineItems.${lineIndex}.debit`, line1Debit.toFixed(2), {
        shouldValidate: false,
      });
      setValue(`lineItems.${lineIndex}.credit`, line1Credit.toFixed(2), {
        shouldValidate: false,
      });

      // Insert a new line after the current one with line2 amounts
      insert(lineIndex + 1, {
        accountId: line.accountId,
        debit: line2Debit.toFixed(2),
        credit: line2Credit.toFixed(2),
        memo: line.memo ?? "",
        dimensionTags: {},
      });
    },
    [watchedLineItems, setValue, insert]
  );

  const hasManyDimensions = dimensions.length >= 4;
  // Total columns: Account + dimensions + Debit + Credit + Memo + Actions
  const totalColumns = 5 + dimensions.length;

  return (
    <div className="space-y-3">
      {/* Desktop table layout (sm and up) */}
      <div
        className={`hidden sm:block overflow-x-auto rounded-lg border border-border${
          hasManyDimensions ? " relative" : ""
        }`}
      >
        <table className="w-full text-sm" style={hasManyDimensions ? { minWidth: `${600 + dimensions.length * 180}px` } : undefined}>
          <thead>
            <tr className="border-b bg-muted/50">
              <th
                className={`px-3 py-2 text-left font-medium w-[260px]${
                  hasManyDimensions
                    ? " sticky left-0 z-10 bg-muted/50"
                    : ""
                }`}
              >
                Account
              </th>
              {dimensions.map((dim) => (
                <th
                  key={dim.id}
                  className="px-3 py-2 text-left font-medium w-[180px]"
                >
                  {dim.name}
                </th>
              ))}
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
                <td
                  className={`px-2 py-1.5${
                    hasManyDimensions
                      ? " sticky left-0 z-10 bg-background"
                      : ""
                  }`}
                >
                  <AccountCombobox
                    value={watchedLineItems?.[index]?.accountId ?? ""}
                    onChange={(accountId) =>
                      setValue(`lineItems.${index}.accountId`, accountId, {
                        shouldValidate: false,
                      })
                    }
                    entityId={entityId}
                    disabled={disabled}
                    accounts={accounts}
                    accountLabel={accountLabels?.[watchedLineItems?.[index]?.accountId ?? ""]}
                  />
                </td>
                {/* Dimension columns */}
                {dimensions.map((dim) => (
                  <td key={dim.id} className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <div className="flex-1 min-w-0">
                        <DimensionCombobox
                          dimensionId={dim.id}
                          dimensionName={dim.name}
                          value={
                            (watchedLineItems?.[index]?.dimensionTags as Record<string, string> | undefined)?.[dim.id] ?? ""
                          }
                          onChange={(tagId) =>
                            handleDimensionTagChange(index, dim.id, tagId)
                          }
                          entityId={entityId}
                          disabled={disabled}
                          initialTags={dim.tags?.filter(t => t.isActive).map(t => ({
                            ...t,
                            dimensionId: dim.id,
                            description: null,
                            sortOrder: 0,
                          }))}
                        />
                      </div>
                      {!disabled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setSplitState({
                              open: true,
                              lineIndex: index,
                              dimensionName: dim.name,
                            })
                          }
                          aria-label={`Split line for ${dim.name}`}
                          className="shrink-0"
                        >
                          <Scissors className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                ))}
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
            <JETotalsRow
              totalDebit={totalDebit}
              totalCredit={totalCredit}
              extraColSpan={dimensions.length}
            />
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
            {/* Dimension fields */}
            {dimensions.map((dim) => (
              <div key={dim.id} className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  {dim.name}
                </span>
                <DimensionCombobox
                  dimensionId={dim.id}
                  dimensionName={dim.name}
                  value={
                    (watchedLineItems?.[index]?.dimensionTags as Record<string, string> | undefined)?.[dim.id] ?? ""
                  }
                  onChange={(tagId) =>
                    handleDimensionTagChange(index, dim.id, tagId)
                  }
                  entityId={entityId}
                  disabled={disabled}
                />
              </div>
            ))}
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

      {/* Split Assistant Dialog */}
      <SplitAssistant
        open={splitState.open}
        onOpenChange={(open) => setSplitState((s) => ({ ...s, open }))}
        lineIndex={splitState.lineIndex}
        currentLine={{
          debit: watchedLineItems?.[splitState.lineIndex]?.debit || "0",
          credit: watchedLineItems?.[splitState.lineIndex]?.credit || "0",
        }}
        dimensionName={splitState.dimensionName}
        onSplit={handleSplit}
      />
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
