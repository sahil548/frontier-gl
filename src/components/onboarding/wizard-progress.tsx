"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  progress: {
    coaComplete: boolean;
    holdingsComplete: boolean;
    balancesComplete: boolean;
    transactionsComplete: boolean;
  };
  onStepClick: (step: number) => void;
}

const STEPS = [
  { key: "coaComplete" as const, label: "Chart of Accounts" },
  { key: "holdingsComplete" as const, label: "Holdings" },
  { key: "balancesComplete" as const, label: "Opening Balances" },
  { key: "transactionsComplete" as const, label: "First Transactions" },
];

/**
 * Visual checklist showing wizard step completion status.
 * Completed steps show green check, current step highlighted, future dimmed.
 * Each step is clickable to jump to that step.
 */
export function WizardProgress({
  currentStep,
  progress,
  onStepClick,
}: WizardProgressProps) {
  return (
    <nav className="space-y-1">
      {STEPS.map((step, index) => {
        const isComplete = progress[step.key];
        const isCurrent = index === currentStep;

        return (
          <button
            key={step.key}
            onClick={() => onStepClick(index)}
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors text-left",
              isCurrent
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {isComplete ? (
              <Check className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
            ) : (
              <Circle
                className={cn(
                  "h-4 w-4 shrink-0",
                  isCurrent
                    ? "text-primary"
                    : "text-muted-foreground/50"
                )}
              />
            )}
            <span>{step.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
