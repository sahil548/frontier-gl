"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isWizardInProgress,
  type WizardProgress,
} from "@/lib/onboarding/wizard-progress";

interface ReturnToWizardBannerProps {
  entityId: string;
}

/**
 * Persistent "Return to Setup" affordance rendered from the authenticated header.
 *
 * Visible when BOTH:
 *   - the current entity has an incomplete wizard (isWizardInProgress === true)
 *   - the current route is NOT already /onboarding/*
 *
 * Renders null (not a placeholder) during the initial wizard-progress fetch so
 * there is no banner flicker on first paint.
 */
export function ReturnToWizardBanner({ entityId }: ReturnToWizardBannerProps) {
  const pathname = usePathname();
  const [progress, setProgress] = useState<WizardProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchProgress() {
      try {
        const res = await fetch(`/api/entities/${entityId}/wizard-progress`);
        if (res.ok) {
          const json = await res.json();
          if (!cancelled && json.success) {
            setProgress(json.data as WizardProgress);
          }
        }
      } catch {
        // Silently fail — don't show banner on network error
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProgress();
    return () => {
      cancelled = true;
    };
  }, [entityId]);

  // Don't flash a banner while we're still figuring out whether to show one
  if (loading) return null;

  // Hide on /onboarding/* — user is already in the wizard
  if (pathname?.startsWith("/onboarding/")) return null;

  // Hide when wizard is complete or dismissed
  if (!isWizardInProgress(progress)) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      render={<Link href={`/onboarding/${entityId}`} />}
      className="h-8 gap-1.5"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Return to Setup
    </Button>
  );
}
