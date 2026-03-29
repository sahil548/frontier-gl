"use client";

import { useState, useEffect } from "react";
import { RefreshCw, Play, Square, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Template {
  id: string;
  name: string;
  description: string | null;
  isRecurring: boolean;
  frequency: string | null;
  nextRunDate: string | null;
  lastRunDate: string | null;
  lines: Array<{ id: string }>;
}

interface RecurringManagerProps {
  entityId: string;
  onEntriesGenerated?: () => void;
}

export function RecurringManager({ entityId, onEntriesGenerated }: RecurringManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [frequency, setFrequency] = useState<string>("monthly");
  const [nextRunDate, setNextRunDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [entityId]);

  async function fetchTemplates() {
    try {
      const res = await fetch(`/api/entities/${entityId}/templates`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTemplates(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  const recurringTemplates = templates.filter((t) => t.isRecurring);
  const nonRecurringTemplates = templates.filter((t) => !t.isRecurring && t.lines.length > 0);

  async function generateRecurring() {
    setGenerating(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/templates/recurring`,
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
          onEntriesGenerated?.();
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

  async function setupRecurring() {
    if (!selectedTemplateId || !frequency || !nextRunDate) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/templates/recurring`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "setup",
            templateId: selectedTemplateId,
            frequency,
            nextRunDate,
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Recurring schedule set");
        setSetupOpen(false);
        fetchTemplates();
      } else {
        toast.error(json.error ?? "Failed to set up");
      }
    } catch {
      toast.error("Failed to set up recurring");
    } finally {
      setSaving(false);
    }
  }

  async function stopRecurring(templateId: string) {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/templates/recurring`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", templateId }),
        }
      );
      if (res.ok) {
        toast.success("Recurring stopped");
        fetchTemplates();
      }
    } catch {
      toast.error("Failed to stop recurring");
    }
  }

  if (loading) return null;
  if (templates.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RefreshCw className="h-4 w-4" />
              Recurring Entries
            </CardTitle>
            <CardDescription>
              Auto-generate draft JEs from templates on a schedule
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
              <DialogTrigger
                render={
                  <Button variant="outline" size="sm" disabled={nonRecurringTemplates.length === 0} />
                }
              >
                <Clock className="mr-1 h-3 w-3" />
                Schedule
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Set Up Recurring Entry</DialogTitle>
                  <DialogDescription>
                    Choose a template and schedule to auto-generate draft journal entries.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select
                      value={selectedTemplateId || null}
                      onValueChange={(val) => setSelectedTemplateId(val as string)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select template" />
                      </SelectTrigger>
                      <SelectContent>
                        {nonRecurringTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={frequency}
                      onValueChange={(val) => setFrequency(val as string)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>First Run Date</Label>
                    <Input
                      type="date"
                      value={nextRunDate}
                      onChange={(e) => setNextRunDate(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={setupRecurring} disabled={saving || !selectedTemplateId}>
                    {saving ? "Saving..." : "Set Schedule"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {recurringTemplates.length > 0 && (
              <Button
                size="sm"
                onClick={generateRecurring}
                disabled={generating}
              >
                <Play className="mr-1 h-3 w-3" />
                {generating ? "Generating..." : "Generate Now"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {recurringTemplates.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {recurringTemplates.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.frequency} — next:{" "}
                      {t.nextRunDate
                        ? new Date(t.nextRunDate).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {t.frequency}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => stopRecurring(t.id)}
                    title="Stop recurring"
                  >
                    <Square className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
