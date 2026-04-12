"use client";

import { useState } from "react";
import { Building2, TrendingUp, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WizardCoaStepProps {
  entityId: string;
  onComplete: () => void;
  onSkip: () => void;
}

const TEMPLATES = [
  {
    key: "family_office" as const,
    label: "Family Office",
    icon: Building2,
    description:
      "40+ accounts covering assets, liabilities, equity, income, and expenses for typical family office operations.",
  },
  {
    key: "hedge_fund" as const,
    label: "Hedge Fund",
    icon: TrendingUp,
    description:
      "Prime brokerage, long/short securities, management/performance fees, and partner capital accounts.",
  },
  {
    key: "blank" as const,
    label: "Start Blank",
    icon: FileText,
    description:
      "Begin with an empty chart of accounts and build your own structure from scratch.",
  },
];

/**
 * Step 1: COA template picker.
 * Shows 3 template cards. Clicking a template applies it via the templates API.
 */
export function WizardCoaStep({
  entityId,
  onComplete,
  onSkip,
}: WizardCoaStepProps) {
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const handleApply = async (templateKey: string) => {
    if (templateKey === "blank") {
      onComplete();
      return;
    }

    setApplying(true);
    setSelected(templateKey);
    try {
      const res = await fetch(`/api/entities/${entityId}/accounts/template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateName: templateKey }),
      });

      const json = await res.json();
      if (json.success) {
        const count = json.data?.inserted ?? 0;
        toast.success(`Imported ${count} accounts`);
        onComplete();
      } else {
        toast.error(json.error || "Failed to apply template");
      }
    } catch {
      toast.error("Failed to apply template");
    } finally {
      setApplying(false);
      setSelected(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Choose a template to get started quickly, or start blank and build your
          own.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          const isApplying = applying && selected === tmpl.key;

          return (
            <Card
              key={tmpl.key}
              className={cn(
                "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm",
                isApplying && "opacity-70 pointer-events-none"
              )}
              onClick={() => !applying && handleApply(tmpl.key)}
            >
              <CardHeader className="pb-3">
                <Icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle className="text-base">
                  {isApplying ? "Applying..." : tmpl.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {tmpl.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <a
          href="/accounts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Customize accounts
          <ExternalLink className="h-3 w-3" />
        </a>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
