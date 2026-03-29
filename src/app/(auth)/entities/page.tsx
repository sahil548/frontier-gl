"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EntityTypeBadge } from "@/components/entities/entity-type-badge";
import { Badge } from "@/components/ui/badge";
import type { SerializedEntity } from "@/types";

export default function EntitiesPage() {
  const [entities, setEntities] = useState<SerializedEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchEntities() {
      try {
        const res = await fetch("/api/entities");
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setEntities(json.data);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntities();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading entities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Entities</h1>
          <p className="text-muted-foreground">
            Manage your family office entities
          </p>
        </div>
        <Button render={<Link href="/entities/new" />}>
          <Plus className="mr-2 h-4 w-4" />
          Create Entity
        </Button>
      </div>

      {entities.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              No entities yet. Create your first entity to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entities.map((entity) => (
            <Link key={entity.id} href={`/entities/${entity.id}`}>
              <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{entity.name}</CardTitle>
                    {!entity.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <EntityTypeBadge type={entity.type} />
                    <span>FYE: {entity.fiscalYearEnd}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
