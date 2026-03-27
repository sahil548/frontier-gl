"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EntityForm } from "@/components/entities/entity-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedEntity } from "@/types";

export default function EditEntityPage() {
  const params = useParams();
  const entityId = params.entityId as string;
  const [entity, setEntity] = useState<SerializedEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntity() {
      try {
        const res = await fetch(`/api/entities/${entityId}`);
        const json = await res.json();
        if (json.success) {
          setEntity(json.data);
        } else {
          setError(json.error || "Entity not found");
        }
      } catch {
        setError("Failed to load entity");
      } finally {
        setIsLoading(false);
      }
    }
    fetchEntity();
  }, [entityId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading entity...</p>
      </div>
    );
  }

  if (error || !entity) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error || "Entity not found"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Entity</h1>
        <p className="text-muted-foreground">{entity.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
          <CardDescription>
            Update entity information or deactivate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntityForm
            mode="edit"
            defaultValues={{
              id: entity.id,
              name: entity.name,
              type: entity.type,
              typeOther: entity.typeOther || "",
              fiscalYearEnd: entity.fiscalYearEnd,
              coaTemplate: entity.coaTemplate,
              isActive: entity.isActive,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
