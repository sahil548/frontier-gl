"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useEntityContext } from "@/providers/entity-provider";
import { JEForm } from "@/components/journal-entries/je-form";
import { JEAuditTrail } from "@/components/journal-entries/je-audit-trail";

type SerializedLineItem = {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  memo: string | null;
  sortOrder: number;
  account?: { id: string; number: string; name: string; type: string };
};

type AuditEntry = {
  id: string;
  action: string;
  userId: string;
  changes: unknown;
  createdAt: string;
};

type SerializedJournalEntry = {
  id: string;
  entityId: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  createdBy: string;
  approvedBy: string | null;
  postedBy: string | null;
  createdAt: string;
  approvedAt: string | null;
  postedAt: string | null;
  reversalOfId: string | null;
  lineItems?: SerializedLineItem[];
  auditEntries?: AuditEntry[];
  reversedById?: string;
};

/**
 * Journal entry detail/edit page.
 * Fetches JE from API and renders JEForm in edit/read-only mode.
 * Shows audit trail below the form.
 */
export default function JournalEntryDetailPage() {
  const params = useParams<{ journalEntryId: string }>();
  const { currentEntityId, isLoading: entitiesLoading } = useEntityContext();
  const [entry, setEntry] = useState<SerializedJournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all" || !params.journalEntryId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/journal-entries/${params.journalEntryId}`
      );
      const json = await res.json();
      if (json.success) {
        setEntry(json.data);
      } else {
        setError(json.error || "Failed to load journal entry");
      }
    } catch {
      setError("Failed to load journal entry");
    } finally {
      setIsLoading(false);
    }
  }, [currentEntityId, params.journalEntryId]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  if (entitiesLoading || isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading journal entry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Journal entry not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {entry.entryNumber} - Journal Entry
      </h1>

      <JEForm
        mode="edit"
        entityId={entry.entityId}
        entry={entry}
      />

      {/* Audit trail */}
      {entry.auditEntries && entry.auditEntries.length > 0 && (
        <JEAuditTrail entries={entry.auditEntries} />
      )}
    </div>
  );
}
