"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EliminationRulesTable } from "@/components/settings/elimination-rules-table";
import { EliminationRuleForm } from "@/components/settings/elimination-rule-form";
import type { SerializedEliminationRule } from "@/types/consolidated";

type EntityOption = { id: string; name: string };

export default function EliminationsSettingsPage() {
  const [rules, setRules] = useState<SerializedEliminationRule[]>([]);
  const [entities, setEntities] = useState<EntityOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] =
    useState<SerializedEliminationRule | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/consolidated/elimination-rules");
      const json = await res.json();
      if (json.success) {
        setRules(json.data?.data ?? json.data ?? []);
      }
    } catch {
      toast.error("Failed to fetch elimination rules");
    }
  }, []);

  const fetchEntities = useCallback(async () => {
    try {
      const res = await fetch("/api/entities");
      const json = await res.json();
      if (json.success) {
        setEntities(
          (json.data ?? []).map((e: { id: string; name: string }) => ({
            id: e.id,
            name: e.name,
          }))
        );
      }
    } catch {
      toast.error("Failed to fetch entities");
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchRules(), fetchEntities()]).finally(() =>
      setIsLoading(false)
    );
  }, [fetchRules, fetchEntities]);

  const handleToggle = async (ruleId: string, isActive: boolean) => {
    try {
      const res = await fetch(
        `/api/consolidated/elimination-rules/${ruleId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(isActive ? "Rule activated" : "Rule deactivated");
        fetchRules();
      } else {
        toast.error(json.error || "Failed to toggle rule");
      }
    } catch {
      toast.error("Failed to toggle rule");
    }
  };

  const handleEdit = (rule: SerializedEliminationRule) => {
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingRule(null);
    fetchRules();
  };

  const handleFormClose = (open: boolean) => {
    if (!open) {
      setShowForm(false);
      setEditingRule(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Intercompany Eliminations
          </h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Intercompany Eliminations
          </h1>
          <p className="text-muted-foreground">
            Define elimination rules for intercompany balances in consolidated
            reports.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Rule
        </Button>
      </div>

      <EliminationRulesTable
        rules={rules}
        onToggle={handleToggle}
        onEdit={handleEdit}
      />

      <EliminationRuleForm
        rule={editingRule ?? undefined}
        entities={entities}
        open={showForm}
        onOpenChange={handleFormClose}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
