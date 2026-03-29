"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Landmark,
  TrendingUp,
  Building2,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils/accounting";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────

interface HoldingItem {
  id: string;
  name: string;
  itemType: string;
  accountId: string;
  costBasis: string | null;
  fairMarketValue: string | null;
  currentBalance: string;
  counterparty: string | null;
  referenceNumber: string | null;
  acquiredDate: string | null;
  notes: string | null;
  isActive: boolean;
  account?: { id: string; number: string; name: string; type: string };
  _reconciliationCount: number;
}

interface AccountOption {
  id: string;
  number: string;
  name: string;
  type: string;
}

const ITEM_TYPES = [
  { value: "BANK_ACCOUNT", label: "Bank Account", icon: Landmark },
  { value: "INVESTMENT", label: "Investment", icon: TrendingUp },
  { value: "REAL_ESTATE", label: "Real Estate", icon: Building2 },
  { value: "LOAN", label: "Loan", icon: Wallet },
  { value: "PRIVATE_EQUITY", label: "Private Equity", icon: TrendingUp },
  { value: "RECEIVABLE", label: "Receivable", icon: Wallet },
  { value: "OTHER", label: "Other", icon: Wallet },
];

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.label])
);

const TYPE_COLORS: Record<string, string> = {
  BANK_ACCOUNT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  INVESTMENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REAL_ESTATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  LOAN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PRIVATE_EQUITY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  RECEIVABLE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

type FilterTab = "all" | "BANK_ACCOUNT" | "INVESTMENT" | "REAL_ESTATE" | "LOAN" | "OTHER";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BANK_ACCOUNT", label: "Bank Accounts" },
  { value: "INVESTMENT", label: "Investments" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "LOAN", label: "Loans" },
  { value: "OTHER", label: "Other" },
];

// ─── Main Page ──────────────────────────────────────────

export default function HoldingsPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();
  const [items, setItems] = useState<HoldingItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<HoldingItem | null>(null);
  const [reconItem, setReconItem] = useState<HoldingItem | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("BANK_ACCOUNT");
  const [formAccountId, setFormAccountId] = useState("");
  const [formBalance, setFormBalance] = useState("");
  const [formCounterparty, setFormCounterparty] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formCostBasis, setFormCostBasis] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Recon form
  const [reconDate, setReconDate] = useState(new Date().toISOString().split("T")[0]);
  const [reconBalance, setReconBalance] = useState("");
  const [reconSaving, setReconSaving] = useState(false);
  const [reconResult, setReconResult] = useState<{
    glBalance: string;
    difference: string;
    status: string;
  } | null>(null);

  const fetchItems = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all") return;
    setLoading(true);
    try {
      const res = await fetch(`/api/entities/${currentEntityId}/subledger`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setItems(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [currentEntityId]);

  const fetchAccounts = useCallback(async () => {
    if (!currentEntityId || currentEntityId === "all") return;
    try {
      const res = await fetch(`/api/entities/${currentEntityId}/accounts`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setAccounts(
            json.data.filter(
              (a: AccountOption) => a.type === "ASSET" || a.type === "LIABILITY"
            )
          );
        }
      }
    } catch { /* ignore */ }
  }, [currentEntityId]);

  useEffect(() => {
    fetchItems();
    fetchAccounts();
  }, [fetchItems, fetchAccounts]);

  // ─── Handlers ──────────────────────────────────────

  function resetForm() {
    setFormName("");
    setFormType("BANK_ACCOUNT");
    setFormAccountId("");
    setFormBalance("");
    setFormCounterparty("");
    setFormRef("");
    setFormCostBasis("");
    setFormNotes("");
  }

  function openEdit(item: HoldingItem) {
    setFormName(item.name);
    setFormType(item.itemType);
    setFormAccountId(item.accountId);
    setFormBalance(item.currentBalance);
    setFormCounterparty(item.counterparty ?? "");
    setFormRef(item.referenceNumber ?? "");
    setFormCostBasis(item.costBasis ?? "");
    setFormNotes(item.notes ?? "");
    setEditItem(item);
  }

  async function handleSave() {
    if (!formName.trim() || !formAccountId) return;
    setSaving(true);
    const isEdit = !!editItem;
    const url = isEdit
      ? `/api/entities/${currentEntityId}/subledger/${editItem.id}`
      : `/api/entities/${currentEntityId}/subledger`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: formAccountId,
          name: formName.trim(),
          itemType: formType,
          currentBalance: parseFloat(formBalance) || 0,
          counterparty: formCounterparty.trim() || undefined,
          referenceNumber: formRef.trim() || undefined,
          costBasis: formCostBasis ? parseFloat(formCostBasis) : undefined,
          notes: formNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(isEdit ? "Holding updated" : "Holding added");
        setAddOpen(false);
        setEditItem(null);
        resetForm();
        fetchItems();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleReconcile() {
    if (!reconItem || !reconBalance) return;
    setReconSaving(true);
    setReconResult(null);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/subledger/${reconItem.id}/reconcile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            statementDate: reconDate,
            statementBalance: parseFloat(reconBalance),
          }),
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setReconResult({
          glBalance: json.data.glBalance,
          difference: json.data.difference,
          status: json.data.status,
        });
        const diff = parseFloat(json.data.difference);
        if (Math.abs(diff) < 0.005) {
          toast.success("Reconciled — GL matches statement");
        } else {
          toast.warning(`Difference of ${formatCurrency(diff)}`);
        }
        fetchItems();
      } else {
        toast.error(json.error ?? "Reconciliation failed");
      }
    } catch {
      toast.error("Reconciliation failed");
    } finally {
      setReconSaving(false);
    }
  }

  // ─── Early returns ─────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Holdings</h1>
        <p className="text-muted-foreground">Create an entity first.</p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Holdings</h1>
        <p className="text-muted-foreground">
          Select a specific entity to manage holdings.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);

  // ─── Computed values ───────────────────────────────

  const bankItems = items.filter((i) => i.itemType === "BANK_ACCOUNT");
  const investItems = items.filter((i) =>
    ["INVESTMENT", "PRIVATE_EQUITY"].includes(i.itemType)
  );
  const reItems = items.filter((i) => i.itemType === "REAL_ESTATE");
  const loanItems = items.filter((i) => i.itemType === "LOAN");

  const sum = (arr: HoldingItem[]) =>
    arr.reduce((s, i) => s + parseFloat(i.currentBalance || "0"), 0);

  const filtered =
    filter === "all"
      ? items
      : filter === "INVESTMENT"
        ? investItems
        : filter === "OTHER"
          ? items.filter((i) =>
              !["BANK_ACCOUNT", "INVESTMENT", "PRIVATE_EQUITY", "REAL_ESTATE", "LOAN"].includes(i.itemType)
            )
          : items.filter((i) => i.itemType === filter);

  const showCostBasis = ["INVESTMENT", "REAL_ESTATE", "PRIVATE_EQUITY"].includes(formType);

  // ─── Form dialog content ───────────────────────────

  const formContent = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Chase Operating #4421" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={formType} onValueChange={(v) => setFormType(v as string)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ITEM_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>GL Account</Label>
          <Select value={formAccountId || null} onValueChange={(v) => setFormAccountId(v as string)}>
            <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.number} — {a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Current Balance</Label>
          <Input type="number" step="0.01" value={formBalance} onChange={(e) => setFormBalance(e.target.value)} placeholder="0.00" />
        </div>
        {showCostBasis && (
          <div className="space-y-2">
            <Label>Cost Basis</Label>
            <Input type="number" step="0.01" value={formCostBasis} onChange={(e) => setFormCostBasis(e.target.value)} placeholder="0.00" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Counterparty</Label>
          <Input value={formCounterparty} onChange={(e) => setFormCounterparty(e.target.value)} placeholder="e.g., Chase Bank" />
        </div>
        <div className="space-y-2">
          <Label>Reference #</Label>
          <Input value={formRef} onChange={(e) => setFormRef(e.target.value)} placeholder="e.g., #4421" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Optional notes" />
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Holdings & Accounts</h1>
          <p className="text-muted-foreground text-sm">{currentEntity?.name}</p>
        </div>
        <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Holding
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Holding</DialogTitle>
              <DialogDescription>Track a bank account, investment, property, or liability.</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter>
              <Button onClick={handleSave} disabled={saving || !formName.trim() || !formAccountId}>
                {saving ? "Adding..." : "Add Holding"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bank Accounts</CardTitle>
            <Landmark className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(sum(bankItems))}</div>
            <p className="text-xs text-muted-foreground">{bankItems.length} account{bankItems.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Investments</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(sum(investItems))}</div>
            <p className="text-xs text-muted-foreground">{investItems.length} holding{investItems.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Real Estate</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-amber-600">{formatCurrency(sum(reItems))}</div>
            <p className="text-xs text-muted-foreground">{reItems.length} propert{reItems.length !== 1 ? "ies" : "y"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Loans & Liabilities</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatCurrency(sum(loanItems))}</div>
            <p className="text-xs text-muted-foreground">{loanItems.length} loan{loanItems.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "px-3 py-2 text-sm font-medium transition-colors border-b-2",
              filter === tab.value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {tab.value !== "all" && (
              <span className="ml-1.5 text-xs text-muted-foreground">
                {tab.value === "INVESTMENT"
                  ? investItems.length
                  : tab.value === "OTHER"
                    ? items.filter((i) => !["BANK_ACCOUNT", "INVESTMENT", "PRIVATE_EQUITY", "REAL_ESTATE", "LOAN"].includes(i.itemType)).length
                    : items.filter((i) => i.itemType === tab.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border py-12 text-center">
          <p className="text-muted-foreground">No holdings found. Add one to get started.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={cn("border-0 text-xs", TYPE_COLORS[item.itemType] ?? "")}>
                      {TYPE_LABELS[item.itemType] ?? item.itemType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.account && (
                      <button
                        onClick={() => window.location.href = `/gl-ledger/${item.account!.id}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {item.account.number} {item.account.name}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.counterparty ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatCurrency(parseFloat(item.currentBalance))}
                  </TableCell>
                  <TableCell>
                    {item._reconciliationCount > 0 ? (
                      <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <ShieldCheck className="h-3 w-3" /> Reconciled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" /> Unreconciled
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(item)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setReconItem(item);
                          setReconBalance("");
                          setReconResult(null);
                        }}
                      >
                        Reconcile
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => { if (!open) { setEditItem(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holding</DialogTitle>
            <DialogDescription>Update holding details.</DialogDescription>
          </DialogHeader>
          {formContent}
          <DialogFooter>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconcile dialog */}
      <Dialog open={!!reconItem} onOpenChange={(open) => { if (!open) { setReconItem(null); setReconResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconcile: {reconItem?.name}</DialogTitle>
            <DialogDescription>Enter the statement balance to compare against the GL.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Statement Date</Label>
              <Input type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Statement Balance</Label>
              <Input type="number" step="0.01" value={reconBalance} onChange={(e) => setReconBalance(e.target.value)} placeholder="Enter balance from statement" />
            </div>
            {reconResult && (
              <Card className={cn(
                parseFloat(reconResult.difference) === 0
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-yellow-500 bg-yellow-50 dark:bg-yellow-950"
              )}>
                <CardContent className="py-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>GL Balance</span>
                    <span className="font-mono">{formatCurrency(parseFloat(reconResult.glBalance))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Statement Balance</span>
                    <span className="font-mono">{formatCurrency(parseFloat(reconBalance))}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-1">
                    <span>Difference</span>
                    <span className="font-mono">{formatCurrency(parseFloat(reconResult.difference))}</span>
                  </div>
                  <Badge variant={reconResult.status === "COMPLETED" ? "default" : "secondary"} className="mt-1">
                    {reconResult.status === "COMPLETED" ? "Reconciled" : "Variance — Review Needed"}
                  </Badge>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleReconcile} disabled={reconSaving || !reconBalance}>
              {reconSaving ? "Reconciling..." : "Reconcile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
