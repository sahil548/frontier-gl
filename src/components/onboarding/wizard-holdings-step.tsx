"use client";

import { Landmark, BarChart3, Home, Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WizardHoldingsStepProps {
  entityId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const HOLDING_TYPES = [
  { icon: Landmark, label: "Bank Account", description: "Checking, savings, or money market" },
  { icon: BarChart3, label: "Investment Account", description: "Brokerage, retirement, or custody" },
  { icon: Home, label: "Real Estate", description: "Property holdings or REITs" },
  { icon: Briefcase, label: "Private Equity", description: "Fund interests or direct investments" },
];

/**
 * Step 2: Holdings setup.
 * Brief explanation of holdings with links to the Holdings page.
 * All steps are skippable -- marking complete when user clicks Continue.
 */
export function WizardHoldingsStep({
  entityId,
  onComplete,
  onSkip,
}: WizardHoldingsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Holdings</h2>
        <p className="text-sm text-muted-foreground">
          Add your bank accounts, investments, and other holdings. You can always
          add more later from the Holdings page.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {HOLDING_TYPES.map((ht) => {
          const Icon = ht.icon;
          return (
            <Card key={ht.label} className="flex items-center gap-3 p-4">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <CardContent className="p-0">
                <p className="text-sm font-medium">{ht.label}</p>
                <p className="text-xs text-muted-foreground">{ht.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="rounded-md border border-dashed p-4">
        <p className="text-sm text-muted-foreground">
          Visit the{" "}
          <a
            href="/holdings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          >
            Holdings page
            <ExternalLink className="h-3 w-3" />
          </a>{" "}
          to add and manage your holdings. Come back here when you are ready to
          continue.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button onClick={onComplete}>Continue</Button>
      </div>
    </div>
  );
}
