"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { BookmarkPlus } from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { JEForm } from "@/components/journal-entries/je-form";
import { JEAuditTrail } from "@/components/journal-entries/je-audit-trail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          {entry.entryNumber} - Journal Entry
        </h1>
        {entry.lineItems && entry.lineItems.length > 0 && (
          <SaveAsTemplateButton entry={entry} />
        )}
      </div>

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

function SaveAsTemplateButton({ entry }: { entry: SerializedJournalEntry }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(entry.description || "");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/entities/${entry.entityId}/templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || undefined,
            lines: (entry.lineItems ?? []).map((li) => ({
              accountId: li.accountId,
              debit: parseFloat(li.debit),
              credit: parseFloat(li.credit),
              memo: li.memo,
            })),
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Template "${name}" saved`);
        setOpen(false);
      } else {
        toast.error(json.error ?? "Failed to save template");
      }
    } catch {
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <BookmarkPlus className="mr-2 h-4 w-4" />
        Save as Template
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
          <DialogDescription>
            Save this journal entry&apos;s line items as a reusable template.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Rent Accrual"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-desc">Description (optional)</Label>
            <Input
              id="template-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Recurring monthly rent expense"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            {entry.lineItems?.length ?? 0} line items will be saved.
          </p>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
