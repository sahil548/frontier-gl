"use client";

import { useEntityContext } from "@/providers/entity-provider";
import { JEForm } from "@/components/journal-entries/je-form";

/**
 * New Journal Entry page.
 * Renders the JE form in create mode.
 */
export default function NewJournalEntryPage() {
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
          New Journal Entry
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to create journal entries.
        </p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          New Journal Entry
        </h1>
        <p className="text-muted-foreground">
          Select a specific entity to create a journal entry.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New Journal Entry
      </h1>
      <JEForm mode="create" entityId={currentEntityId} />
    </div>
  );
}
