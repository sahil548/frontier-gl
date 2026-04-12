"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WizardProgress } from "@/components/onboarding/wizard-progress";
import { WizardCoaStep } from "@/components/onboarding/wizard-coa-step";
import { WizardHoldingsStep } from "@/components/onboarding/wizard-holdings-step";
import { WizardBalancesStep } from "@/components/onboarding/wizard-balances-step";
import { WizardTransactionsStep } from "@/components/onboarding/wizard-transactions-step";

// ── Types ───────────────────────────────────────────────

interface WizardProgressData {
  coaComplete: boolean;
  holdingsComplete: boolean;
  balancesComplete: boolean;
  transactionsComplete: boolean;
  dismissedAt?: string;
}

const DEFAULT_PROGRESS: WizardProgressData = {
  coaComplete: false,
  holdingsComplete: false,
  balancesComplete: false,
  transactionsComplete: false,
};

const STEP_KEYS: (keyof Omit<WizardProgressData, "dismissedAt">)[] = [
  "coaComplete",
  "holdingsComplete",
  "balancesComplete",
  "transactionsComplete",
];

interface OnboardingWizardProps {
  entityId: string;
  entityName: string;
}

// ── Component ───────────────────────────────────────────

/**
 * Multi-step onboarding wizard container.
 * Manages current step, progress persistence, and step navigation.
 * Fetches/saves progress via the wizard-progress API.
 */
export function OnboardingWizard({
  entityId,
  entityName,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<WizardProgressData>(DEFAULT_PROGRESS);
  const [loading, setLoading] = useState(true);

  // Fetch progress on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchProgress() {
      try {
        const res = await fetch(`/api/entities/${entityId}/wizard-progress`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success) {
            setProgress(json.data);

            // Start at first incomplete step
            const p = json.data as WizardProgressData;
            const firstIncomplete = STEP_KEYS.findIndex((key) => !p[key]);
            if (firstIncomplete >= 0) {
              setCurrentStep(firstIncomplete);
            }
          }
        }
      } catch {
        // Use default progress
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProgress();
    return () => { cancelled = true; };
  }, [entityId]);

  // Mark a step complete and persist
  const markComplete = useCallback(
    async (stepKey: keyof Omit<WizardProgressData, "dismissedAt">) => {
      const updated = { ...progress, [stepKey]: true };
      setProgress(updated);

      try {
        await fetch(`/api/entities/${entityId}/wizard-progress`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [stepKey]: true }),
        });
      } catch {
        // Best effort persist
      }

      // Advance to next step or show completion
      const nextIdx = currentStep + 1;
      if (nextIdx < STEP_KEYS.length) {
        setCurrentStep(nextIdx);
      } else {
        // All steps done, stay on completion view
        setCurrentStep(STEP_KEYS.length);
      }
    },
    [entityId, progress, currentStep]
  );

  // Skip without marking complete
  const skipStep = useCallback(() => {
    const nextIdx = currentStep + 1;
    if (nextIdx < STEP_KEYS.length) {
      setCurrentStep(nextIdx);
    } else {
      setCurrentStep(STEP_KEYS.length);
    }
  }, [currentStep]);

  const handleFinish = () => {
    router.push("/dashboard");
  };

  // Check if all steps complete
  const allComplete = STEP_KEYS.every((key) => progress[key]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading wizard...</p>
      </div>
    );
  }

  // Completion view
  if (currentStep >= STEP_KEYS.length || allComplete) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center space-y-6">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {allComplete ? "Setup Complete!" : "Setup Summary"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {allComplete
              ? `${entityName} is ready to use. You can always adjust settings from the sidebar.`
              : `You can return to complete skipped steps from the dashboard.`}
          </p>
        </div>
        <div className="space-y-2">
          {STEP_KEYS.map((key, i) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-md border px-4 py-2 text-sm"
            >
              <span>
                Step {i + 1}:{" "}
                {key === "coaComplete"
                  ? "Chart of Accounts"
                  : key === "holdingsComplete"
                    ? "Holdings"
                    : key === "balancesComplete"
                      ? "Opening Balances"
                      : "First Transactions"}
              </span>
              <span
                className={
                  progress[key]
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : "text-muted-foreground"
                }
              >
                {progress[key] ? "Complete" : "Skipped"}
              </span>
            </div>
          ))}
        </div>
        <Button onClick={handleFinish} size="lg">
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Set up {entityName}
        </h1>
        <p className="text-muted-foreground">
          Step {currentStep + 1} of {STEP_KEYS.length} -- All steps can be
          skipped and completed later.
        </p>
      </div>

      {/* Wizard layout: sidebar + content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        {/* Progress sidebar */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <WizardProgress
              currentStep={currentStep}
              progress={progress}
              onStepClick={(step) => setCurrentStep(step)}
            />
          </CardContent>
        </Card>

        {/* Step content */}
        <Card className="p-6">
          {currentStep === 0 && (
            <WizardCoaStep
              entityId={entityId}
              onComplete={() => markComplete("coaComplete")}
              onSkip={skipStep}
            />
          )}
          {currentStep === 1 && (
            <WizardHoldingsStep
              entityId={entityId}
              onComplete={() => markComplete("holdingsComplete")}
              onSkip={skipStep}
            />
          )}
          {currentStep === 2 && (
            <WizardBalancesStep
              entityId={entityId}
              onComplete={() => markComplete("balancesComplete")}
              onSkip={skipStep}
            />
          )}
          {currentStep === 3 && (
            <WizardTransactionsStep
              entityId={entityId}
              onComplete={() => markComplete("transactionsComplete")}
              onSkip={skipStep}
            />
          )}
        </Card>
      </div>

      {/* Dismiss option */}
      <div className="text-center">
        <Button variant="link" className="text-muted-foreground" onClick={handleFinish}>
          Skip setup and go to dashboard
        </Button>
      </div>
    </div>
  );
}
