"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type CategorizePromptProps = {
  entityId: string;
  transactionDescription: string;
  merchantName: string | null;
  accountId: string;
  accountName: string;
  onDismiss: () => void;
};

/**
 * Extracts a pattern from a transaction description for rule creation.
 * Uses merchant name if available, otherwise first 3+ words of description.
 */
function extractPattern(description: string, merchantName: string | null): string {
  if (merchantName) return merchantName;

  // Take first 3 words or the whole description if shorter
  const words = description.trim().split(/\s+/);
  if (words.length <= 3) return description.trim();
  return words.slice(0, 3).join(" ");
}

/**
 * Inline prompt shown after manual categorization.
 * Offers to create a categorization rule for similar future transactions.
 */
export function CategorizePrompt({
  entityId,
  transactionDescription,
  merchantName,
  accountId,
  accountName,
  onDismiss,
}: CategorizePromptProps) {
  const [isCreating, setIsCreating] = useState(false);

  const pattern = extractPattern(transactionDescription, merchantName);

  const handleCreateRule = async () => {
    setIsCreating(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/rules`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pattern,
            accountId,
          }),
        }
      );

      const json = await res.json();
      if (json.success) {
        toast.success(`Rule created: "${pattern}" will auto-categorize as ${accountName}`);
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

  return (
    <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900 dark:bg-blue-950">
      <span className="text-blue-700 dark:text-blue-300">
        Always categorize &quot;{pattern}&quot; as{" "}
        <span className="font-medium">{accountName}</span>?
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
    </div>
  );
}
