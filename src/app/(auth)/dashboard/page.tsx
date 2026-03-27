"use client";

import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
  const { entities, isLoading, currentEntityId } = useEntityContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Show onboarding if user has no entities
  if (entities.length === 0) {
    return <WelcomeScreen />;
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const contextLabel = currentEntity ? currentEntity.name : "All Entities";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Viewing: {contextLabel}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard Coming in Phase 4</CardTitle>
          <CardDescription>
            Financial summaries, trial balance previews, and period close
            status will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="outline" render={<Link href="/entities" />}>
              <Building2 className="mr-2 h-4 w-4" />
              Manage Entities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
