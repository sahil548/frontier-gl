"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AccountCombobox } from "@/components/ui/account-combobox";
import { DimensionCombobox } from "@/components/journal-entries/dimension-combobox";

// ---- Types ----------------------------------------------------------------

export type RuleData = {
  id?: string;
  pattern: string;
  amountMin?: number;
  amountMax?: number;
  accountId: string;
  dimensionTags?: Record<string, string>;
};

type AccountOption = {
  id: string;
  accountNumber: string;
  name: string;
};

type DimensionInfo = {
  id: string;
  name: string;
};

type RuleFormProps = {
  mode: "create" | "edit";
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editRule?: RuleData;
};

// ---- Accounts cache -------------------------------------------------------

let accountsCache: AccountOption[] = [];
let accountsCacheTime = 0;
const CACHE_TTL = 60_000;

async function fetchAccountsCached(entityId: string): Promise<AccountOption[]> {
  if (accountsCache.length > 0 && Date.now() - accountsCacheTime < CACHE_TTL) {
    return accountsCache;
  }
  const res = await fetch(`/api/entities/${entityId}/accounts`);
  if (!res.ok) return [];
  const json = await res.json();
  if (!json.success) return [];
  accountsCache = (json.data as { id: string; number: string; name: string }[]).map(
    (a) => ({ id: a.id, accountNumber: a.number, name: a.name })
  );
  accountsCacheTime = Date.now();
  return accountsCache;
}

// ---- Component ------------------------------------------------------------

export function RuleForm({
  mode,
  entityId,
  open,
  onOpenChange,
  onSuccess,
  editRule,
}: RuleFormProps) {
  const isEdit = mode === "edit" && editRule?.id;

  // Form fields
  const [pattern, setPattern] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [accountId, setAccountId] = useState<string>("");
  const [dimensionTags, setDimensionTags] = useState<Record<string, string>>({});

  // Data
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [dimensions, setDimensions] = useState<DimensionInfo[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch accounts
  useEffect(() => {
    if (!entityId || !open) return;
    fetchAccountsCached(entityId).then(setAccounts);
  }, [entityId, open]);

  // Fetch dimensions
  useEffect(() => {
    if (!entityId || !open) return;
    (async () => {
      try {
        const res = await fetch(`/api/entities/${entityId}/dimensions`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const dims = (json.data as { id: string; name: string; isActive: boolean }[])
              .filter((d) => d.isActive);
            setDimensions(dims);
          }
        }
      } catch {
        // silently fail
      }
    })();
  }, [entityId, open]);

  // Reset form when opened
  useEffect(() => {
    if (open) {
      if (isEdit && editRule) {
        setPattern(editRule.pattern);
        setAmountMin(editRule.amountMin != null ? String(editRule.amountMin) : "");
        setAmountMax(editRule.amountMax != null ? String(editRule.amountMax) : "");
        setAccountId(editRule.accountId);
        setDimensionTags(editRule.dimensionTags ?? {});
      } else {
        setPattern("");
        setAmountMin("");
        setAmountMax("");
        setAccountId("");
        setDimensionTags({});
      }
    }
  }, [open, isEdit, editRule]);

  const handleDimensionTagChange = useCallback(
    (dimensionId: string, tagId: string) => {
      setDimensionTags((prev) => ({ ...prev, [dimensionId]: tagId }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pattern.trim()) {
      toast.error("Pattern is required");
      return;
    }
    if (!accountId) {
      toast.error("Account is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        pattern: pattern.trim(),
        accountId,
      };

      if (amountMin) body.amountMin = parseFloat(amountMin);
      if (amountMax) body.amountMax = parseFloat(amountMax);

      // Only include non-empty dimension tags
      const activeTags: Record<string, string> = {};
      for (const [dimId, tagId] of Object.entries(dimensionTags)) {
        if (tagId) activeTags[dimId] = tagId;
      }
      if (Object.keys(activeTags).length > 0) {
        body.dimensionTags = activeTags;
      }

      const url = isEdit
        ? `/api/entities/${entityId}/bank-transactions/rules/${editRule!.id}`
        : `/api/entities/${entityId}/bank-transactions/rules`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        if (!isEdit && json.data.matchedCount > 0) {
          toast.success(
            `Rule created! ${json.data.matchedCount} existing transaction${json.data.matchedCount === 1 ? "" : "s"} matched.`
          );
        } else {
          toast.success(isEdit ? "Rule updated" : "Rule created");
        }
        onSuccess();
      } else {
        toast.error(json.error || "Failed to save rule");
      }
    } catch {
      toast.error("Failed to save rule");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md overflow-y-auto"
        showOverlay={false}
      >
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Rule" : "New Categorization Rule"}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Update the matching criteria and account assignment."
              : "Create a rule to automatically categorize transactions matching a description pattern."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-4 pb-4">
          {/* Pattern */}
          <div className="space-y-2">
            <Label htmlFor="rule-pattern">Description contains</Label>
            <Input
              id="rule-pattern"
              placeholder="e.g., AMAZON, PAYROLL, PROPERTY MGMT"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Case-insensitive substring match on transaction description
            </p>
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label>Amount between (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Min"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                className="flex-1"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Max"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Matches absolute amount (both debits and credits)
            </p>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label>GL Account</Label>
            <AccountCombobox
              accounts={accounts}
              value={accountId || null}
              onSelect={setAccountId}
              placeholder="Select account..."
            />
          </div>

          {/* Dimension Tags */}
          {dimensions.length > 0 && (
            <div className="space-y-3">
              <Label>Dimension Tags (optional)</Label>
              {dimensions.map((dim) => (
                <div key={dim.id} className="space-y-1">
                  <span className="text-xs text-muted-foreground">{dim.name}</span>
                  <DimensionCombobox
                    dimensionId={dim.id}
                    dimensionName={dim.name}
                    value={dimensionTags[dim.id] ?? ""}
                    onChange={(tagId) => handleDimensionTagChange(dim.id, tagId)}
                    entityId={entityId}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
                ? "Save Changes"
                : "Create Rule"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
