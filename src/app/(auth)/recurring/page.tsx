"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RecurringTemplatesTable,
  type RecurringTemplate,
} from "@/components/recurring/recurring-templates-table";
import { RecurringEditDialog } from "@/components/recurring/recurring-edit-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

export default function RecurringPage() {
  const { currentEntityId, isLoading: entitiesLoading } = useEntityContext();
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editTarget, setEditTarget] = useState<RecurringTemplate | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [stopTarget, setStopTarget] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all") return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/templates/recurring`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTemplates(json.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentEntityId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  async function handleGenerate() {
    if (!currentEntityId || currentEntityId === "all") return;
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/templates/recurring`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "generate" }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        if (json.data.generated > 0) {
          toast.success(`Generated ${json.data.generated} draft entries`);
          fetchTemplates();
        } else {
          toast.info("No recurring entries due yet");
        }
      } else {
        toast.error(json.error ?? "Failed to generate");
      }
    } catch {
      toast.error("Failed to generate recurring entries");
    } finally {
      setGenerating(false);
    }
  }

  function handleEdit(template: RecurringTemplate) {
    setEditTarget(template);
    setEditOpen(true);
  }

  async function handleStopConfirm() {
    if (!stopTarget || !currentEntityId || currentEntityId === "all") return;
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/templates/recurring`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", templateId: stopTarget }),
        }
      );
      if (res.ok) {
        toast.success("Recurring stopped");
        setStopTarget(null);
        fetchTemplates();
      } else {
        toast.error("Failed to stop recurring");
      }
    } catch {
      toast.error("Failed to stop recurring");
    }
  }

  if (entitiesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentEntityId || currentEntityId === "all") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">
          Select an entity to manage recurring entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Recurring Journal Entries
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage recurring templates and generate draft entries on schedule.
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating || templates.length === 0}
        >
          {generating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Due Entries"}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <RecurringTemplatesTable
          templates={templates}
          onGenerate={handleGenerate}
          onEdit={handleEdit}
          onStop={(id) => setStopTarget(id)}
        />
      )}

      {/* Edit dialog */}
      <RecurringEditDialog
        template={editTarget}
        entityId={currentEntityId}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchTemplates}
      />

      {/* Stop confirmation dialog */}
      <Dialog
        open={!!stopTarget}
        onOpenChange={(open) => !open && setStopTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stop Recurring</DialogTitle>
            <DialogDescription>
              Are you sure you want to stop this recurring template? It will no
              longer generate entries automatically. You can set it up again
              later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleStopConfirm}>
              Stop Recurring
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
