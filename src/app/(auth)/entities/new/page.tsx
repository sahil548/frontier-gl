"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { EntityForm } from "@/components/entities/entity-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewEntityPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create Entity
        </h1>
        <p className="text-muted-foreground">
          Add a new entity to your family office
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entity Details</CardTitle>
          <CardDescription>
            Set up the basic information for this entity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntityForm
            mode="create"
            onSuccess={() => {
              toast.success("Entity created successfully");
              router.push("/entities");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
