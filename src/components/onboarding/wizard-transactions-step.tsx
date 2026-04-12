"use client";

import { FileText, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WizardTransactionsStepProps {
  entityId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const NEXT_ACTIONS = [
  {
    icon: FileText,
    title: "Record your first journal entry",
    description: "Create a manual journal entry to record a transaction.",
    href: "/journal-entries/new",
  },
  {
    icon: Upload,
    title: "Import bank transactions",
    description: "Upload a CSV or connect a bank feed to import transactions.",
    href: "/bank-feed",
  },
  {
    icon: RefreshCw,
    title: "Set up recurring entries",
    description: "Create templates for entries that repeat on a schedule.",
    href: "/recurring",
  },
];

/**
 * Step 4: First transactions.
 * Informational guide cards suggesting next actions.
 * Not action-required -- user can skip or finish.
 */
export function WizardTransactionsStep({
  entityId,
  onComplete,
  onSkip,
}: WizardTransactionsStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">First Transactions</h2>
        <p className="text-sm text-muted-foreground">
          Here are some ways to start recording transactions. You can always come
          back to these from the sidebar navigation.
        </p>
      </div>

      <div className="space-y-3">
        {NEXT_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.href}
              href={action.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="flex items-center gap-4 p-4 transition-colors hover:border-primary/50 hover:bg-muted/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardContent className="p-0 flex-1">
                  <p className="text-sm font-medium flex items-center gap-1">
                    {action.title}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </a>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
        <Button onClick={onComplete}>Finish Setup</Button>
      </div>
    </div>
  );
}
