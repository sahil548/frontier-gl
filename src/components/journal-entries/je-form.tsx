"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Save, CheckCircle, Send, RotateCcw, Loader2 } from "lucide-react";
import {
  journalEntrySchema,
  type JournalEntryFormInput,
} from "@/lib/validators/journal-entry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JELineItems, useIsBalanced } from "./je-line-items";
import { JEStatusBadge } from "./je-status-badge";
import Link from "next/link";

type SerializedLineItem = {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  memo: string | null;
  sortOrder: number;
  account?: { id: string; number: string; name: string; type: string };
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
  auditEntries?: Array<{
    id: string;
    action: string;
    userId: string;
    changes: unknown;
    createdAt: string;
  }>;
  /** If this entry was reversed, the reversing entry's ID */
  reversedById?: string;
};

type JEFormProps = {
  mode: "create" | "edit";
  entityId: string;
  entry?: SerializedJournalEntry;
};

/**
 * Full-page journal entry form.
 * Supports create mode, edit mode (drafts only), and read-only mode (posted entries).
 * Three action buttons: Save Draft, Approve, Post (with balance gating).
 * Reverse button on posted entries.
 */
export function JEForm({ mode, entityId, entry }: JEFormProps) {
  const router = useRouter();
  const isPosted = entry?.status === "POSTED";
  const isApproved = entry?.status === "APPROVED";
  const isReadOnly = isPosted;
  const isEdit = mode === "edit" && entry;

  const defaultLineItems =
    entry?.lineItems?.map((li) => ({
      accountId: li.accountId,
      debit: li.debit,
      credit: li.credit,
      memo: li.memo ?? "",
    })) ?? [
      { accountId: "", debit: "0", credit: "0", memo: "" },
      { accountId: "", debit: "0", credit: "0", memo: "" },
    ];

  const methods = useForm<JournalEntryFormInput>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      date: entry?.date
        ? new Date(entry.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      description: entry?.description ?? "",
      lineItems: defaultLineItems,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = methods;

  return (
    <FormProvider {...methods}>
      <JEFormInner
        entityId={entityId}
        mode={mode}
        entry={entry}
        isEdit={!!isEdit}
        isPosted={isPosted}
        isApproved={isApproved}
        isReadOnly={isReadOnly}
        register={register}
        handleSubmit={handleSubmit}
        errors={errors}
        router={router}
      />
    </FormProvider>
  );
}

/**
 * Inner form component that can use useIsBalanced (needs FormProvider context).
 */
function JEFormInner({
  entityId,
  mode,
  entry,
  isEdit,
  isPosted,
  isApproved,
  isReadOnly,
  register,
  handleSubmit,
  errors,
  router,
}: {
  entityId: string;
  mode: "create" | "edit";
  entry?: SerializedJournalEntry;
  isEdit: boolean;
  isPosted: boolean;
  isApproved: boolean;
  isReadOnly: boolean;
  register: ReturnType<typeof useForm<JournalEntryFormInput>>["register"];
  handleSubmit: ReturnType<typeof useForm<JournalEntryFormInput>>["handleSubmit"];
  errors: ReturnType<typeof useForm<JournalEntryFormInput>>["formState"]["errors"];
  router: ReturnType<typeof useRouter>;
}) {
  const isBalanced = useIsBalanced();
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  const saveEntry = async (
    data: JournalEntryFormInput,
    action: "draft" | "approve" | "post"
  ) => {
    setIsSubmitting(action);
    try {
      // Step 1: Save/create the entry
      const url = isEdit
        ? `/api/entities/${entityId}/journal-entries/${entry!.id}`
        : `/api/entities/${entityId}/journal-entries`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error || "Failed to save entry");
        return;
      }

      const savedEntry = json.data;

      // Step 2: If action is approve or post, call workflow endpoint
      if (action === "approve") {
        const approveRes = await fetch(
          `/api/entities/${entityId}/journal-entries/${savedEntry.id}/approve`,
          { method: "POST" }
        );
        const approveJson = await approveRes.json();
        if (!approveJson.success) {
          toast.error(approveJson.error || "Saved but failed to approve");
          router.push(`/journal-entries/${savedEntry.id}`);
          return;
        }
        toast.success("Journal entry approved");
      } else if (action === "post") {
        const postRes = await fetch(
          `/api/entities/${entityId}/journal-entries/${savedEntry.id}/post`,
          { method: "POST" }
        );
        const postJson = await postRes.json();
        if (!postJson.success) {
          toast.error(postJson.error || "Saved but failed to post");
          router.push(`/journal-entries/${savedEntry.id}`);
          return;
        }
        toast.success("Journal entry posted");
      } else {
        toast.success(isEdit ? "Draft updated" : "Draft saved");
      }

      router.push(`/journal-entries/${savedEntry.id}`);
      router.refresh();
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleReverse = async () => {
    if (!entry) return;
    setIsSubmitting("reverse");
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${entry.id}/reverse`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Reversal draft created");
        router.push(`/journal-entries/${json.data.id}`);
      } else {
        toast.error(json.error || "Failed to create reversal");
      }
    } catch {
      toast.error("Failed to create reversal");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEdit && entry && (
            <>
              <h2 className="text-lg font-semibold">{entry.entryNumber}</h2>
              <JEStatusBadge status={entry.status} />
            </>
          )}
        </div>

        {/* Reversal links */}
        {entry?.reversalOfId && (
          <Link
            href={`/journal-entries/${entry.reversalOfId}`}
            className="text-sm text-primary hover:underline"
          >
            Reversal of original entry
          </Link>
        )}
        {entry?.reversedById && (
          <Link
            href={`/journal-entries/${entry.reversedById}`}
            className="text-sm text-muted-foreground hover:underline"
          >
            Reversed by entry
          </Link>
        )}
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit((data) => saveEntry(data, "draft"))}
        className="space-y-6"
      >
        {/* Header fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="je-date">Date</Label>
            <Input
              id="je-date"
              type="date"
              {...register("date")}
              disabled={isReadOnly}
            />
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="je-description">Description</Label>
            <Input
              id="je-description"
              placeholder="Entry description or memo"
              {...register("description")}
              disabled={isReadOnly}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <Label>Line Items</Label>
          <JELineItems entityId={entityId} disabled={isReadOnly} />
          {errors.lineItems && typeof errors.lineItems.message === "string" && (
            <p className="text-sm text-destructive">
              {errors.lineItems.message}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          {isPosted ? (
            // Posted: show Reverse button only
            <Button
              type="button"
              variant="outline"
              onClick={handleReverse}
              disabled={isSubmitting !== null}
            >
              {isSubmitting === "reverse" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-4 w-4" />
              )}
              Reverse
            </Button>
          ) : isApproved ? (
            // Approved: show Post button only
            <Button
              type="button"
              onClick={handleSubmit((data) => saveEntry(data, "post"))}
              disabled={!isBalanced || isSubmitting !== null}
            >
              {isSubmitting === "post" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Post
            </Button>
          ) : (
            // Draft or create: show Save Draft, Approve, Post
            <>
              <Button
                type="submit"
                variant="outline"
                disabled={isSubmitting !== null}
              >
                {isSubmitting === "draft" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Draft
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={handleSubmit((data) => saveEntry(data, "approve"))}
                disabled={!isBalanced || isSubmitting !== null}
              >
                {isSubmitting === "approve" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-1.5 h-4 w-4" />
                )}
                Approve
              </Button>

              <Button
                type="button"
                onClick={handleSubmit((data) => saveEntry(data, "post"))}
                disabled={!isBalanced || isSubmitting !== null}
              >
                {isSubmitting === "post" ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-4 w-4" />
                )}
                Post
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
