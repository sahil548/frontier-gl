"use client";

import { useState, useEffect, useCallback } from "react";
import { PlusCircle } from "lucide-react";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { AccountTable } from "@/components/accounts/account-table";
import { AccountForm } from "@/components/accounts/account-form";

type SerializedAccount = {
  id: string;
  entityId: string;
  number: string;
  name: string;
  type: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  balance: string;
  debitTotal?: string;
  creditTotal?: string;
};

/**
 * Chart of Accounts page.
 * Displays an indented table of accounts for the selected entity.
 * Provides "New Account" button and template application for empty states.
 */
export default function AccountsPage() {
  const { currentEntityId, entities, isLoading: entitiesLoading } = useEntityContext();
  const [accounts, setAccounts] = useState<SerializedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    if (!currentEntityId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/accounts`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAccounts(json.data);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, [currentEntityId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  if (entitiesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Chart of Accounts
        </h1>
        <p className="text-muted-foreground">
          Create an entity first to manage accounts.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);
  const contextLabel = currentEntity ? currentEntity.name : "All Entities";

  // For "all" entity scope, we show accounts but disable create
  const canCreate = currentEntityId !== "all";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground text-sm">
            Viewing: {contextLabel}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Account
          </Button>
        )}
      </div>

      {/* Account table */}
      <AccountTable
        entityId={currentEntityId}
        accounts={accounts}
        isLoading={isLoading}
        onRefresh={fetchAccounts}
      />

      {/* New account slide-over (triggered from header button) */}
      {canCreate && (
        <AccountForm
          mode="create"
          entityId={currentEntityId}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={fetchAccounts}
          accounts={accounts}
        />
      )}
    </div>
  );
}
