"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useEntityContext } from "@/providers/entity-provider";
import { EntityForm } from "@/components/entities/entity-form";
import { TeamManagement } from "@/components/entities/team-management";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SerializedEntity } from "@/types";

export default function EditEntityPage() {
  const params = useParams();
  const entityId = params.entityId as string;
  const { refreshEntities } = useEntityContext();
  const { user } = useUser();
  const [entity, setEntity] = useState<SerializedEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserEmail = user?.emailAddresses?.[0]?.emailAddress;

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Entity</h1>
        <p className="text-muted-foreground">{entity.name}</p>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
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
                onSuccess={async () => {
                  await refreshEntities();
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Access</CardTitle>
              <CardDescription>
                Manage who has access to this entity. Owners can add and remove
                members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamManagement
                entityId={entityId}
                currentUserEmail={currentUserEmail}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
