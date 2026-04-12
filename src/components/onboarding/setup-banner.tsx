"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface WizardProgress {
  coaComplete: boolean;
  holdingsComplete: boolean;
  balancesComplete: boolean;
  transactionsComplete: boolean;
  dismissedAt?: string;
}

interface SetupBannerProps {
  entityId: string;
  entityName: string;
}

/**
 * Setup banner shown on the dashboard when wizard is incomplete.
 * Self-manages visibility based on wizard progress fetch.
 * Renders nothing if all steps complete or banner was dismissed.
 */
export function SetupBanner({ entityId, entityName }: SetupBannerProps) {
  const [progress, setProgress] = useState<WizardProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProgress() {
      try {
        const res = await fetch(`/api/entities/${entityId}/wizard-progress`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success) {
            setProgress(json.data);
          }
        }
      } catch {
        // Silently fail -- don't show banner on error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProgress();
    return () => { cancelled = true; };
  }, [entityId]);

  if (loading || !progress) return null;

  // Don't show if dismissed
  if (progress.dismissedAt || dismissed) return null;

  // Count completed steps
  const steps = [
    progress.coaComplete,
    progress.holdingsComplete,
    progress.balancesComplete,
    progress.transactionsComplete,
  ];
  const completedCount = steps.filter(Boolean).length;
  const totalSteps = steps.length;

  // Don't show if all steps complete
  if (completedCount === totalSteps) return null;

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await fetch(`/api/entities/${entityId}/wizard-progress`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismissedAt: new Date().toISOString() }),
      });
    } catch {
      // Best effort dismiss
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
      <CardContent className="flex items-center justify-between py-4 px-5">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            Continue setting up {entityName}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount} of {totalSteps} steps complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href={`/onboarding/${entityId}`} />}
          >
            Continue Setup
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
