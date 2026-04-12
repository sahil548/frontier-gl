"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RuleForm, type RuleData } from "@/components/bank-feed/rule-form";

// ---- Types ----------------------------------------------------------------

type SerializedRule = {
  id: string;
  pattern: string;
  amountMin: string | null;
  amountMax: string | null;
  accountId: string | null;
  positionId: string | null;
  account: { id: string; number: string; name: string; type: string } | null;
  positionName: string | null;
  holdingName: string | null;
  holdingType: string | null;
  dimensionTags: Record<string, string> | null;
  isActive: boolean;
  priority: number;
  matchedCount: number;
  createdAt: string;
};

// ---- Helpers --------------------------------------------------------------

function formatAmountRange(min: string | null, max: string | null): string {
  if (!min && !max) return "Any";
  const fmtNum = (v: string) =>
    parseFloat(v).toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  if (min && max) return `$${fmtNum(min)} - $${fmtNum(max)}`;
  if (min) return `>= $${fmtNum(min)}`;
  return `<= $${fmtNum(max!)}`;
}

/** Render the target column: position name as primary label with GL detail for
 *  position-targeted rules, or account name for accountId-only rules. */
function renderTarget(rule: SerializedRule): React.ReactNode {
  // Position-targeted rule: show "HoldingName -> PositionName" with GL detail
  if (rule.positionId && rule.holdingName && rule.positionName) {
    return (
      <div>
        <div className="font-medium text-sm">
          {rule.holdingName} -&gt; {rule.positionName}
        </div>
        {rule.account && (
          <div className="text-xs text-muted-foreground">
            ({rule.account.number} - {rule.account.name})
          </div>
        )}
      </div>
    );
  }

  // Account-only rule (legacy or GL fallback)
  if (rule.account) {
    return (
      <span className="text-sm">
        {rule.account.number} - {rule.account.name}
      </span>
    );
  }

  return <span className="text-sm text-muted-foreground">--</span>;
}

// ---- Component ------------------------------------------------------------

export default function RulesPage() {
  const { currentEntityId, entities, isLoading: entityLoading } = useEntityContext();
  const [rules, setRules] = useState<SerializedRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editRule, setEditRule] = useState<RuleData | undefined>(undefined);

  // Delete dialog state
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const entityId = currentEntityId === "all" ? "" : currentEntityId;

  const fetchRules = useCallback(async () => {
    if (!entityId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/bank-transactions/rules`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setRules(json.data as SerializedRule[]);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [entityId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleAddRule = () => {
    setFormMode("create");
    setEditRule(undefined);
    setFormOpen(true);
  };

  const handleEditRule = (rule: SerializedRule) => {
    setFormMode("edit");
    setEditRule({
      id: rule.id,
      pattern: rule.pattern,
      amountMin: rule.amountMin ? parseFloat(rule.amountMin) : undefined,
      amountMax: rule.amountMax ? parseFloat(rule.amountMax) : undefined,
      accountId: rule.accountId ?? "",
      positionId: rule.positionId ?? undefined,
      dimensionTags: rule.dimensionTags ?? undefined,
    });
    setFormOpen(true);
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId || !entityId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/bank-transactions/rules/${deleteRuleId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Rule deactivated");
        setDeleteRuleId(null);
        fetchRules();
      } else {
        toast.error(json.error || "Failed to delete rule");
      }
    } catch {
      toast.error("Failed to delete rule");
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- Guards -------------------------------------------------------------

  if (entityLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0 || currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Categorization Rules</h1>
        <p className="text-muted-foreground">
          Select a specific entity to manage categorization rules.
        </p>
      </div>
    );
  }

  // ---- Render -------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/bank-feed"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Bank Feed
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Categorization Rules</h1>
        </div>
        <Button onClick={handleAddRule}>
          <Plus className="mr-2 h-4 w-4" />
          Add Rule
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-md bg-muted" />
          ))}
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-md border py-12 text-center">
          <p className="text-muted-foreground">
            No categorization rules yet. Rules are created automatically when you
            categorize transactions, or you can add them manually.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pattern</TableHead>
                <TableHead>Amount Range</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Matched</TableHead>
                <TableHead className="text-right w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">
                      {rule.pattern}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatAmountRange(rule.amountMin, rule.amountMax)}
                  </TableCell>
                  <TableCell>{renderTarget(rule)}</TableCell>
                  <TableCell>
                    {rule.dimensionTags &&
                    typeof rule.dimensionTags === "object" &&
                    Object.keys(rule.dimensionTags).length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(rule.dimensionTags).map((dimId) => (
                          <Badge key={dimId} variant="outline" className="text-xs">
                            Tagged
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">--</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {rule.matchedCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setDeleteRuleId(rule.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Rule form Sheet */}
      <RuleForm
        mode={formMode}
        entityId={entityId}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={() => {
          setFormOpen(false);
          fetchRules();
        }}
        editRule={editRule}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteRuleId} onOpenChange={(open) => { if (!open) setDeleteRuleId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Rule</DialogTitle>
            <DialogDescription>
              This will deactivate the rule so it no longer applies to future
              transactions. Already-categorized transactions will keep their
              current categorization.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRuleId(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRule}
              disabled={isDeleting}
            >
              {isDeleting ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
