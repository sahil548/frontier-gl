"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Search,
  Pencil,
  MoreHorizontal,
  BookOpen,
  Plus,
  Ban,
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { AccountTypeChips } from "./account-type-chips";
import { AccountForm } from "./account-form";
import Decimal from "decimal.js";

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
 * Account type badge color mapping.
 */
const TYPE_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  ASSET: "default",
  LIABILITY: "secondary",
  EQUITY: "outline",
  INCOME: "default",
  EXPENSE: "secondary",
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

/**
 * Format a balance string as currency.
 */
function formatCurrency(value: string): string {
  const num = new Decimal(value);
  const abs = num.abs();
  const formatted = abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (num.isNegative()) {
    return `($${formatted})`;
  }
  return `$${formatted}`;
}

/**
 * Flatten accounts into tree-order: parent first, then children sorted by number.
 */
function flattenAccounts(accounts: SerializedAccount[]): SerializedAccount[] {
  const parents = accounts
    .filter((a) => a.parentId === null)
    .sort((a, b) => a.number.localeCompare(b.number));

  const childrenMap = new Map<string, SerializedAccount[]>();
  for (const account of accounts) {
    if (account.parentId) {
      const siblings = childrenMap.get(account.parentId) || [];
      siblings.push(account);
      childrenMap.set(account.parentId, siblings);
    }
  }

  const result: SerializedAccount[] = [];
  for (const parent of parents) {
    result.push(parent);
    const children = childrenMap.get(parent.id) || [];
    children.sort((a, b) => a.number.localeCompare(b.number));
    result.push(...children);
  }

  return result;
}

/**
 * Compute aggregated balance for parent accounts (sum of children balances).
 */
function getDisplayBalance(
  account: SerializedAccount,
  allAccounts: SerializedAccount[]
): string {
  if (account.parentId !== null) {
    return account.balance;
  }

  const children = allAccounts.filter((a) => a.parentId === account.id);
  if (children.length === 0) {
    return account.balance;
  }

  const aggregated = children.reduce(
    (sum, child) => sum.plus(new Decimal(child.balance)),
    new Decimal(account.balance)
  );
  return aggregated.toString();
}

type AccountTableProps = {
  entityId: string;
  accounts: SerializedAccount[];
  isLoading: boolean;
  onRefresh: () => void;
};

/**
 * Indented flat table for Chart of Accounts.
 * 4 columns: Account Number, Account Name, Type, Balance.
 * Supports search, type filter chips, hover actions.
 */
export function AccountTable({
  entityId,
  accounts,
  isLoading,
  onRefresh,
}: AccountTableProps) {
  const [search, setSearch] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editAccount, setEditAccount] = useState<SerializedAccount | undefined>();
  const [defaultParentId, setDefaultParentId] = useState<string | undefined>();
  const [deactivateTarget, setDeactivateTarget] = useState<SerializedAccount | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    // First pass: find accounts matching search + type filters
    const directMatches = new Set<string>();
    const parentIdsNeeded = new Set<string>();

    for (const account of accounts) {
      // Type filter
      if (activeTypes.size > 0 && !activeTypes.has(account.type)) {
        continue;
      }

      // Search filter
      if (search) {
        const lowerSearch = search.toLowerCase();
        const matchesName = account.name.toLowerCase().includes(lowerSearch);
        const matchesNumber = account.number.startsWith(search);
        if (!matchesName && !matchesNumber) {
          continue;
        }
      }

      directMatches.add(account.id);
      // If a child matches, ensure its parent is included for tree structure
      if (account.parentId) {
        parentIdsNeeded.add(account.parentId);
      }
    }

    return accounts.filter(
      (account) => directMatches.has(account.id) || parentIdsNeeded.has(account.id)
    );
  }, [accounts, search, activeTypes]);

  const flattenedAccounts = useMemo(
    () => flattenAccounts(filteredAccounts),
    [filteredAccounts]
  );

  const handleEdit = (account: SerializedAccount) => {
    setFormMode("edit");
    setEditAccount(account);
    setDefaultParentId(undefined);
    setFormOpen(true);
  };

  const handleAddSubAccount = (parentId: string) => {
    setFormMode("create");
    setEditAccount(undefined);
    setDefaultParentId(parentId);
    setFormOpen(true);
  };

  const handleCreateNew = () => {
    setFormMode("create");
    setEditAccount(undefined);
    setDefaultParentId(undefined);
    setFormOpen(true);
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsDeactivating(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/accounts/${deactivateTarget.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Account deactivated");
        setDeactivateTarget(null);
        onRefresh();
      } else {
        toast.error(json.error || "Failed to deactivate");
      }
    } catch {
      toast.error("Failed to deactivate account");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleApplyTemplate = async () => {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/accounts/template`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success(
          `Template applied: ${json.data.inserted} accounts created, ${json.data.skipped} skipped`
        );
        onRefresh();
      } else {
        toast.error(json.error || "Failed to apply template");
      }
    } catch {
      toast.error("Failed to apply template");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading accounts...</p>
      </div>
    );
  }

  // Empty state
  if (accounts.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <div className="text-center space-y-1">
            <h3 className="text-lg font-medium">No accounts yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Apply the Family Office Standard template or create your first
              account to get started.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleApplyTemplate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Apply Template
            </Button>
            <Button onClick={handleCreateNew}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Account
            </Button>
          </div>
        </div>

        <AccountForm
          mode={formMode}
          entityId={entityId}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSuccess={onRefresh}
          accounts={accounts}
          defaultParentId={defaultParentId}
          editAccount={editAccount}
        />
      </>
    );
  }

  return (
    <>
      {/* Search bar */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type filter chips */}
        <AccountTypeChips
          activeTypes={activeTypes}
          onToggle={handleToggleType}
        />
      </div>

      {/* Accounts table */}
      <div className="mt-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Number</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[140px] text-right">Balance</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {flattenedAccounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No accounts match your search or filters.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              flattenedAccounts.map((account) => {
                const isChild = account.parentId !== null;
                const isParent = accounts.some(
                  (a) => a.parentId === account.id
                );
                const displayBalance = getDisplayBalance(account, accounts);

                return (
                  <TableRow
                    key={account.id}
                    className="group"
                  >
                    {/* Number */}
                    <TableCell
                      className={isChild ? "pl-8" : ""}
                    >
                      <span className={isParent ? "font-semibold" : ""}>
                        {isChild && (
                          <span className="text-muted-foreground mr-1">
                            {"  "}
                          </span>
                        )}
                        {account.number}
                      </span>
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <span className={isParent ? "font-semibold" : ""}>
                        {account.name}
                      </span>
                    </TableCell>

                    {/* Type */}
                    <TableCell>
                      <Badge
                        variant={TYPE_BADGE_VARIANT[account.type] || "outline"}
                      >
                        {TYPE_LABELS[account.type] || account.type}
                      </Badge>
                    </TableCell>

                    {/* Balance */}
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(displayBalance)}
                    </TableCell>

                    {/* Hover actions */}
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(account)}
                          aria-label={`Edit ${account.name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              />
                            }
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                            <span className="sr-only">More actions</span>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <BookOpen className="mr-2 h-4 w-4" />
                              View Ledger
                            </DropdownMenuItem>

                            {/* Add Sub-Account: only for top-level accounts */}
                            {!isChild && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAddSubAccount(account.id)
                                }
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Sub-Account
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeactivateTarget(account)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Deactivate
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Deactivation confirmation dialog */}
      <Dialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Account</DialogTitle>
            <DialogDescription>
              This will hide &quot;{deactivateTarget?.number} -{" "}
              {deactivateTarget?.name}&quot; from the chart of accounts.
              Existing journal entries will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isDeactivating}
            >
              {isDeactivating ? "Deactivating..." : "Confirm Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slide-over form */}
      <AccountForm
        mode={formMode}
        entityId={entityId}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSuccess={onRefresh}
        accounts={accounts}
        defaultParentId={defaultParentId}
        editAccount={editAccount}
      />
    </>
  );
}
