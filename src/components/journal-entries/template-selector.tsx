"use client";

import { useState, useEffect } from "react";
import { FileStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TemplateLine {
  accountId: string;
  debit: string;
  credit: string;
  memo: string | null;
  account?: { id: string; number: string; name: string; type: string };
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  lines: TemplateLine[];
}

interface TemplateSelectorProps {
  entityId: string;
  onSelect: (lines: TemplateLine[]) => void;
}

export function TemplateSelector({ entityId, onSelect }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entityId || entityId === "all") return;

    setLoading(true);
    fetch(`/api/entities/${entityId}/templates`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setTemplates(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, entityId]);

  const handleSelect = (template: Template) => {
    onSelect(template.lines);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <FileStack className="mr-2 h-4 w-4" />
        Use Template
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
          <DialogDescription>
            Choose a template to pre-fill the journal entry lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {loading && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Loading templates...
            </p>
          )}

          {!loading && templates.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No templates found. Save a journal entry as a template first.
            </p>
          )}

          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted"
            >
              <p className="font-medium text-sm">{template.name}</p>
              {template.description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {template.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {template.lines.length} line items
              </p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
