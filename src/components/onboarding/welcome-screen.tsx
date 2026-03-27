"use client";

import { useRouter } from "next/navigation";
import { useEntityContext } from "@/providers/entity-provider";
import { EntityForm } from "@/components/entities/entity-form";

/**
 * Welcome screen shown when a user has zero entities.
 * Displays a clean onboarding experience with an embedded entity creation form.
 *
 * After entity creation, refreshes the entity list in context before navigating
 * to the dashboard. This avoids a race condition where router.refresh() in
 * EntityForm would conflict with the redirect.
 */
export function WelcomeScreen() {
  const router = useRouter();
  const { refreshEntities } = useEntityContext();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="mx-auto w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-7 w-7 text-primary"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1.5" />
              <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1.5" />
              <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome to Frontier GL
          </h1>
          <p className="text-muted-foreground">
            Create your first entity to get started
          </p>
        </div>

        {/* Entity creation form */}
        <div className="rounded-lg border bg-card p-6">
          <EntityForm
            mode="create"
            onSuccess={async () => {
              await refreshEntities();
              router.push("/dashboard");
            }}
          />
        </div>
      </div>
    </div>
  );
}
