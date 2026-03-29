"use client";

import { useState } from "react";
import { useEntityContext } from "@/providers/entity-provider";
import { JEForm } from "@/components/journal-entries/je-form";
import { TemplateSelector } from "@/components/journal-entries/template-selector";

interface TemplateLine {
  accountId: string;
  debit: string;
  credit: string;
  memo: string | null;
}

export default function NewJournalEntryPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();
  const [templateLines, setTemplateLines] = useState<TemplateLine[] | null>(null);
  const [formKey, setFormKey] = useState(0);

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

  const handleTemplateSelect = (lines: TemplateLine[]) => {
    setTemplateLines(lines);
    setFormKey((k) => k + 1); // force re-mount to reset form with new defaults
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          New Journal Entry
        </h1>
        <TemplateSelector
          entityId={currentEntityId}
          onSelect={handleTemplateSelect}
        />
      </div>
      <JEForm
        key={formKey}
        mode="create"
        entityId={currentEntityId}
        initialLines={templateLines ?? undefined}
      />
    </div>
  );
}
