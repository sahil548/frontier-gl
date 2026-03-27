"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type JEBulkActionBarProps = {
  selectedIds: string[];
  activeTab: string;
  entityId: string;
  onComplete: () => void;
  onClearSelection: () => void;
};

/**
 * Floating bulk action bar at the bottom of the viewport.
 * Appears when journal entries are selected via checkboxes.
 * Supports bulk approve (Draft tab) and bulk post (Draft/Approved tabs).
 */
export function JEBulkActionBar({
  selectedIds,
  activeTab,
  entityId,
  onComplete,
  onClearSelection,
}: JEBulkActionBarProps) {
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

  if (selectedIds.length === 0) return null;

  const handleBulkApprove = async () => {
    setIsSubmitting("approve");
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/bulk-approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.data.count} entries approved`);
        onClearSelection();
        onComplete();
      } else {
        toast.error(json.error || "Failed to approve entries");
      }
    } catch {
      toast.error("Failed to approve entries");
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleBulkPost = async () => {
    setIsSubmitting("post");
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/bulk-post`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: selectedIds }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(`${json.data.count} entries posted`);
        onClearSelection();
        onComplete();
      } else {
        toast.error(json.error || "Failed to post entries");
      }
    } catch {
      toast.error("Failed to post entries");
    } finally {
      setIsSubmitting(null);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
        <span className="text-sm font-medium">
          {selectedIds.length} selected
        </span>

        {/* Approve Selected: visible only on Draft tab */}
        {activeTab === "DRAFT" && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleBulkApprove}
            disabled={isSubmitting !== null}
          >
            {isSubmitting === "approve" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
            )}
            Approve Selected
          </Button>
        )}

        {/* Post Selected: visible on Draft and Approved tabs */}
        {(activeTab === "DRAFT" || activeTab === "APPROVED") && (
          <Button
            size="sm"
            onClick={handleBulkPost}
            disabled={isSubmitting !== null}
          >
            {isSubmitting === "post" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="mr-1.5 h-3.5 w-3.5" />
            )}
            Post Selected
          </Button>
        )}

        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onClearSelection}
          aria-label="Clear selection"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
