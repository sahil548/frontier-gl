"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RuleForm, type RuleData } from "@/components/bank-feed/rule-form";

type CategorizePromptProps = {
  entityId: string;
  transactionDescription: string;
  merchantName: string | null;
  accountId: string;
  accountName: string;
  positionId?: string | null;
  positionLabel?: string | null;
  dimensionTags?: Record<string, string>;
  ruleId?: string | null;
  onDismiss: () => void;
  onRuleCreated?: () => void;
};

/**
 * Extracts a pattern from a transaction description for rule creation.
 * Uses merchant name if available, otherwise strips common prefixes and
 * takes the first 3+ meaningful words from the description.
 */
function extractPattern(description: string, merchantName: string | null): string {
  if (merchantName) return merchantName.toUpperCase();

  // Strip common transaction prefixes
  const stripped = description
    .replace(/^(POS|ACH|WIRE|DEBIT|CREDIT|CHECK|XFER|TRANSFER)\s+/i, "")
    .trim();

  // Take first 3 words or the whole description if shorter
  const words = stripped.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 3) return stripped.toUpperCase();
  return words.slice(0, 3).join(" ").toUpperCase();
}

/**
 * Inline prompt shown after manual categorization.
 * Offers to create a categorization rule for similar future transactions.
 *
 * Features:
 * - "Yes, create rule" -- instantly creates rule with extracted pattern
 * - "No, just this once" -- dismisses prompt
 * - "Customize rule..." -- opens RuleForm Sheet pre-filled with pattern and account/position
 *
 * Position-first: If a positionId was used for categorization, the rule is created
 * with positionId (GL resolved at apply-time). Otherwise falls back to accountId.
 */
export function CategorizePrompt({
  entityId,
  transactionDescription,
  merchantName,
  accountId,
  accountName,
  positionId,
  positionLabel,
  dimensionTags,
  ruleId,
  onDismiss,
  onRuleCreated,
}: CategorizePromptProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  // Do not show prompt if transaction was already categorized by a rule
  if (ruleId) return null;

  const pattern = extractPattern(transactionDescription, merchantName);

  // Display label: position name if available, otherwise account name
  const targetLabel = positionLabel || accountName;

  const handleCreateRule = async () => {
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = { pattern };

      // Position-targeted rule: store positionId, GL resolved at apply-time
      if (positionId) {
        body.positionId = positionId;
      } else {
        body.accountId = accountId;
      }

      if (dimensionTags && Object.keys(dimensionTags).length > 0) {
        body.dimensionTags = dimensionTags;
      }

      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      const json = await res.json();
      if (json.success) {
        const matchedCount = json.data.matchedCount ?? 0;
        const msg = matchedCount > 0
          ? `Rule created! ${matchedCount} existing transaction${matchedCount === 1 ? "" : "s"} matched.`
          : `Rule created: "${pattern}" will auto-categorize as ${targetLabel}`;
        toast.success(msg);
        onRuleCreated?.();
        onDismiss();
      } else {
        toast.error(json.error || "Failed to create rule");
      }
    } catch {
      toast.error("Failed to create rule");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCustomize = () => {
    setCustomizeOpen(true);
  };

  const customizeRuleData: RuleData = {
    pattern,
    accountId,
    positionId: positionId ?? undefined,
    dimensionTags,
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900 dark:bg-blue-950">
        <span className="text-blue-700 dark:text-blue-300">
          Always categorize &quot;{pattern}&quot; as{" "}
          <span className="font-medium">{targetLabel}</span>?
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={handleCreateRule}
          disabled={isCreating}
        >
          {isCreating ? "Creating..." : "Yes, create rule"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={onDismiss}
        >
          No, just this once
        </Button>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline dark:text-blue-400"
          onClick={handleCustomize}
        >
          Customize rule...
        </button>
      </div>

      <RuleForm
        mode="create"
        entityId={entityId}
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        onSuccess={() => {
          setCustomizeOpen(false);
          onRuleCreated?.();
          onDismiss();
        }}
        editRule={customizeRuleData}
      />
    </>
  );
}
