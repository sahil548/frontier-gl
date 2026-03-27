"use client";

import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { JEList } from "@/components/journal-entries/je-list";

/**
 * Journal Entries list page.
 * Shows tabbed list with Draft/Approved/Posted tabs, selection, and bulk actions.
 */
export default function JournalEntriesPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Journal Entries
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to manage journal entries.
        </p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Journal Entries
        </h1>
        <p className="text-muted-foreground">
          Select a specific entity to view journal entries.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const contextLabel = currentEntity ? currentEntity.name : "";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Journal Entries
          </h1>
          {contextLabel && (
            <p className="text-muted-foreground text-sm">
              Viewing: {contextLabel}
            </p>
          )}
        </div>
        <Button render={<Link href="/journal-entries/new" />}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Journal Entry
        </Button>
      </div>

      {/* JE List with tabs */}
      <JEList entityId={currentEntityId} />
    </div>
  );
}
