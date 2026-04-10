"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SerializedEliminationRule } from "@/types/consolidated";

type EliminationRulesTableProps = {
  rules: SerializedEliminationRule[];
  onToggle: (ruleId: string, isActive: boolean) => void;
  onEdit: (rule: SerializedEliminationRule) => void;
};

/**
 * Table listing elimination rules with exposure summary and toggle/edit actions.
 */
export function EliminationRulesTable({
  rules,
  onToggle,
  onEdit,
}: EliminationRulesTableProps) {
  const activeCount = rules.filter((r) => r.isActive).length;

  if (rules.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-muted-foreground">
            No intercompany elimination rules defined. Create one to eliminate
            intercompany balances from consolidated reports.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exposure summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Exposure Summary
          </CardTitle>
          <CardDescription>
            {activeCount} active rule{activeCount !== 1 ? "s" : ""} |{" "}
            {rules.length} total intercompany pair{rules.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Rules table */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Label</th>
              <th className="px-4 py-3 text-left font-medium">
                Entity A &gt; Account A
              </th>
              <th className="px-4 py-3 text-left font-medium">
                Entity B &gt; Account B
              </th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b last:border-0">
                <td className="px-4 py-3 font-medium">{rule.label}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {rule.entityAName} &gt; {rule.accountANumber}{" "}
                  {rule.accountAName}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {rule.entityBName} &gt; {rule.accountBNumber}{" "}
                  {rule.accountBName}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Switch
                      checked={rule.isActive}
                      onCheckedChange={(checked: boolean) =>
                        onToggle(rule.id, checked)
                      }
                      size="sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit rule</span>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
