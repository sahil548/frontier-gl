"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Landmark,
  TrendingUp,
  Building2,
  Wallet,
  ShieldCheck,
  AlertCircle,
  Pencil,
  ChevronDown,
  ChevronRight,
  Trash2,
  BarChart2,
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

interface Position {
  id: string;
  subledgerItemId: string;
  name: string;
  positionType: string;
  quantity: string | null;
  unitCost: string | null;
  unitPrice: string | null;
  costBasis: string | null;
  marketValue: string;
  ticker: string | null;
  assetClass: string | null;
  acquiredDate: string | null;
  notes: string | null;
  isActive: boolean;
}

interface AccountOption {
  id: string;
  number: string;
  name: string;
  type: string;
}

// ─── Constants ──────────────────────────────────────────

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

const POSITION_TYPES = [
  { value: "CASH", label: "Cash" },
  { value: "PUBLIC_EQUITY", label: "Public Equity" },
  { value: "FIXED_INCOME", label: "Fixed Income" },
  { value: "MUTUAL_FUND", label: "Mutual Fund" },
  { value: "ETF", label: "ETF" },
  { value: "PRIVATE_EQUITY", label: "Private Equity" },
  { value: "REAL_PROPERTY", label: "Real Property" },
  { value: "ACCUMULATED_DEPRECIATION", label: "Accum. Depreciation" },
  { value: "OTHER", label: "Other" },
];

const POSITION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  POSITION_TYPES.map((t) => [t.value, t.label])
);

// Position types where quantity/price make sense
const QUANTIFIABLE_TYPES = new Set([
  "PUBLIC_EQUITY",
  "FIXED_INCOME",
  "MUTUAL_FUND",
  "ETF",
  "PRIVATE_EQUITY",
]);

type FilterTab = "all" | "BANK_ACCOUNT" | "INVESTMENT" | "REAL_ESTATE" | "LOAN" | "OTHER";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BANK_ACCOUNT", label: "Bank Accounts" },
  { value: "INVESTMENT", label: "Investments" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "LOAN", label: "Loans" },
  { value: "OTHER", label: "Other" },
];

// ─── Positions sub-table ─────────────────────────────────

interface PositionsRowProps {
  entityId: string;
  item: HoldingItem;
  onBalanceUpdated: () => void;
}

function PositionsRow({ entityId, item, onBalanceUpdated }: PositionsRowProps) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPosition, setEditPosition] = useState<Position | null>(null);
  const [saving, setSaving] = useState(false);

  // Position form state
  const [posName, setPosName] = useState("");
  const [posType, setPosType] = useState("PUBLIC_EQUITY");
  const [posTicker, setPosTicker] = useState("");
  const [posAssetClass, setPosAssetClass] = useState("");
  const [posQuantity, setPosQuantity] = useState("");
  const [posUnitCost, setPosUnitCost] = useState("");
  const [posUnitPrice, setPosUnitPrice] = useState("");
  const [posCostBasis, setPosCostBasis] = useState("");
  const [posMarketValue, setPosMarketValue] = useState("");
  const [posAcquired, setPosAcquired] = useState("");
  const [posNotes, setPosNotes] = useState("");

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/subledger/${item.id}/positions`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setPositions(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [entityId, item.id]);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  function resetPosForm() {
    setPosName(""); setPosType("PUBLIC_EQUITY"); setPosTicker("");
    setPosAssetClass(""); setPosQuantity(""); setPosUnitCost("");
    setPosUnitPrice(""); setPosCostBasis(""); setPosMarketValue("");
    setPosAcquired(""); setPosNotes("");
  }

  function openEditPos(p: Position) {
    setPosName(p.name);
    setPosType(p.positionType);
    setPosTicker(p.ticker ?? "");
    setPosAssetClass(p.assetClass ?? "");
    setPosQuantity(p.quantity ?? "");
    setPosUnitCost(p.unitCost ?? "");
    setPosUnitPrice(p.unitPrice ?? "");
    setPosCostBasis(p.costBasis ?? "");
    setPosMarketValue(p.marketValue);
    setPosAcquired(p.acquiredDate ?? "");
    setPosNotes(p.notes ?? "");
    setEditPosition(p);
  }

  function buildPosPayload() {
    const isQuantifiable = QUANTIFIABLE_TYPES.has(posType);
    return {
      name: posName.trim(),
      positionType: posType,
      ...(posTicker.trim() ? { ticker: posTicker.trim() } : {}),
      ...(posAssetClass.trim() ? { assetClass: posAssetClass.trim() } : {}),
      ...(isQuantifiable && posQuantity ? { quantity: parseFloat(posQuantity) } : {}),
      ...(isQuantifiable && posUnitCost ? { unitCost: parseFloat(posUnitCost) } : {}),
      ...(isQuantifiable && posUnitPrice ? { unitPrice: parseFloat(posUnitPrice) } : {}),
      ...(posCostBasis ? { costBasis: parseFloat(posCostBasis) } : {}),
      marketValue: parseFloat(posMarketValue) || 0,
      ...(posAcquired ? { acquiredDate: posAcquired } : {}),
      ...(posNotes.trim() ? { notes: posNotes.trim() } : {}),
    };
  }

  async function savePosition() {
    if (!posName.trim()) return;
    setSaving(true);
    const isEdit = !!editPosition;
    const url = isEdit
      ? `/api/entities/${entityId}/subledger/${item.id}/positions/${editPosition.id}`
      : `/api/entities/${entityId}/subledger/${item.id}/positions`;
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPosPayload()),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(isEdit ? "Position updated" : "Position added");
        setAddOpen(false);
        setEditPosition(null);
        resetPosForm();
        fetchPositions();
        onBalanceUpdated();
      } else {
        toast.error(json.error ?? "Failed to save");
      }
    } catch {
      toast.error("Failed to save position");
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition(posId: string) {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/subledger/${item.id}/positions/${posId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Position removed");
        fetchPositions();
        onBalanceUpdated();
      } else {
        toast.error(json.error ?? "Failed to remove");
      }
    } catch {
      toast.error("Failed to remove position");
    }
  }

  const isQuantifiable = QUANTIFIABLE_TYPES.has(posType);

  // Compute market value from qty × unit price when both entered
  const computedMV =
    isQuantifiable && posQuantity && posUnitPrice
      ? (parseFloat(posQuantity) * parseFloat(posUnitPrice)).toFixed(2)
      : null;

  const posFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={posName} onChange={(e) => setPosName(e.target.value)} placeholder="e.g., AAPL, Cash Sweep" />
        </div>
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={posType} onValueChange={(v) => setPosType(v ?? "OTHER")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {POSITION_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {isQuantifiable && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Ticker</Label>
            <Input value={posTicker} onChange={(e) => setPosTicker(e.target.value)} placeholder="e.g., AAPL" />
          </div>
          <div className="space-y-2">
            <Label>Asset Class</Label>
            <Input value={posAssetClass} onChange={(e) => setPosAssetClass(e.target.value)} placeholder="e.g., Large Cap" />
          </div>
        </div>
      )}
      {isQuantifiable && (
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" step="any" value={posQuantity} onChange={(e) => setPosQuantity(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-2">
            <Label>Unit Cost</Label>
            <Input type="number" step="0.000001" value={posUnitCost} onChange={(e) => setPosUnitCost(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Unit Price</Label>
            <Input type="number" step="0.000001" value={posUnitPrice} onChange={(e) => setPosUnitPrice(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Cost Basis</Label>
          <Input
            type="number"
            step="0.01"
            value={posCostBasis}
            onChange={(e) => setPosCostBasis(e.target.value)}
            placeholder={isQuantifiable && posQuantity && posUnitCost
              ? `Auto: ${(parseFloat(posQuantity || "0") * parseFloat(posUnitCost || "0")).toFixed(2)}`
              : "0.00"}
          />
        </div>
        <div className="space-y-2">
          <Label>Market Value</Label>
          <Input
            type="number"
            step="0.01"
            value={posMarketValue}
            onChange={(e) => setPosMarketValue(e.target.value)}
            placeholder={computedMV ?? "0.00"}
          />
          {computedMV && !posMarketValue && (
            <p className="text-xs text-muted-foreground">
              Auto-computed: {formatCurrency(parseFloat(computedMV))}
              <button
                type="button"
                className="ml-2 text-primary underline"
                onClick={() => setPosMarketValue(computedMV)}
              >
                Use
              </button>
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Acquired Date</Label>
          <Input type="date" value={posAcquired} onChange={(e) => setPosAcquired(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes</Label>
          <Input value={posNotes} onChange={(e) => setPosNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>
    </div>
  );

  const totalMV = positions.reduce((s, p) => s + parseFloat(p.marketValue || "0"), 0);
  const totalCB = positions.reduce((s, p) => s + parseFloat(p.costBasis || "0"), 0);
  const unrealizedPnL = totalMV - totalCB;

  return (
    <TableRow className="bg-muted/30 hover:bg-muted/40">
      <TableCell colSpan={7} className="py-0 px-0">
        <div className="border-l-2 border-primary/20 ml-8 my-2 mr-4">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium text-muted-foreground">Positions</span>
              {!loading && positions.length > 0 && (
                <>
                  <span className="text-muted-foreground">
                    MV: <span className="font-mono text-foreground">{formatCurrency(totalMV)}</span>
                  </span>
                  {totalCB > 0 && (
                    <span className={cn("text-xs font-mono", unrealizedPnL >= 0 ? "text-green-600" : "text-red-600")}>
                      {unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(unrealizedPnL)} unrealized P&L
                    </span>
                  )}
                </>
              )}
            </div>
            <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetPosForm(); }}>
              <DialogTrigger render={<Button variant="outline" size="xs" />}>
                <Plus className="h-3 w-3 mr-1" /> Add Position
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Position — {item.name}</DialogTitle>
                  <DialogDescription>Add an individual security, property, or cash position.</DialogDescription>
                </DialogHeader>
                {posFormContent}
                <DialogFooter>
                  <Button onClick={savePosition} disabled={saving || !posName.trim()}>
                    {saving ? "Adding..." : "Add Position"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="px-4 pb-3 text-sm text-muted-foreground animate-pulse">Loading positions…</div>
          ) : positions.length === 0 ? (
            <div className="px-4 pb-3 text-sm text-muted-foreground">
              No positions yet. Add individual securities, cash sweeps, or properties.
            </div>
          ) : (
            <div className="px-4 pb-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Ticker</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Cost Basis</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Market Value</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">P&L</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => {
                    const mv = parseFloat(p.marketValue || "0");
                    const cb = parseFloat(p.costBasis || "0");
                    const pnl = cb > 0 ? mv - cb : null;
                    return (
                      <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="py-1.5 font-medium">{p.name}</td>
                        <td className="py-1.5 text-muted-foreground">{POSITION_TYPE_LABELS[p.positionType] ?? p.positionType}</td>
                        <td className="py-1.5 font-mono text-xs text-muted-foreground">{p.ticker ?? "—"}</td>
                        <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">
                          {p.quantity ? parseFloat(p.quantity).toLocaleString() : "—"}
                        </td>
                        <td className="py-1.5 text-right font-mono text-xs">
                          {cb > 0 ? formatCurrency(cb) : "—"}
                        </td>
                        <td className="py-1.5 text-right font-mono font-medium">
                          {formatCurrency(mv)}
                        </td>
                        <td className={cn("py-1.5 text-right font-mono text-xs", pnl === null ? "text-muted-foreground" : pnl >= 0 ? "text-green-600" : "text-red-600")}>
                          {pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}` : "—"}
                        </td>
                        <td className="py-1.5 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon-xs" onClick={() => openEditPos(p)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deletePosition(p.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit position dialog */}
        <Dialog open={!!editPosition} onOpenChange={(open) => { if (!open) { setEditPosition(null); resetPosForm(); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Position</DialogTitle>
              <DialogDescription>Update position details.</DialogDescription>
            </DialogHeader>
            {posFormContent}
            <DialogFooter>
              <Button onClick={savePosition} disabled={saving || !posName.trim()}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Page ──────────────────────────────────────────

export default function HoldingsPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();
  const router = useRouter();
  const [items, setItems] = useState<HoldingItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<HoldingItem | null>(null);

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
    setFormName(""); setFormType("BANK_ACCOUNT"); setFormAccountId("");
    setFormBalance(""); setFormCounterparty(""); setFormRef("");
    setFormCostBasis(""); setFormNotes("");
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

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

  // Whether a holding can have positions drilled into
  const canExpand = (item: HoldingItem) =>
    ["INVESTMENT", "PRIVATE_EQUITY", "REAL_ESTATE", "BANK_ACCOUNT"].includes(item.itemType);

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
          <Select value={formAccountId} onValueChange={(v) => setFormAccountId(v as string)}>
            <SelectTrigger>
              <SelectValue placeholder="Select account">
                {formAccountId
                  ? (() => { const a = accounts.find(acc => acc.id === formAccountId); return a ? `${a.number} — ${a.name}` : "Select account"; })()
                  : undefined}
              </SelectValue>
            </SelectTrigger>
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
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>GL Account</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead className="text-right">Balance / MV</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const isExpanded = expandedIds.has(item.id);
                const expandable = canExpand(item);
                return (
                  <>
                    <TableRow key={item.id} className={cn(isExpanded && "bg-muted/20")}>
                      <TableCell className="w-8 px-2">
                        {expandable && (
                          <button
                            onClick={() => toggleExpand(item.id)}
                            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                          >
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5" />
                              : <ChevronRight className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {expandable && (
                            <BarChart2 className="h-3 w-3 text-muted-foreground/50" />
                          )}
                        </div>
                      </TableCell>
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
                            onClick={() => router.push(`/reconcile/${item.id}`)}
                          >
                            Reconcile
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {isExpanded && expandable && (
                      <PositionsRow
                        key={`pos-${item.id}`}
                        entityId={currentEntityId}
                        item={item}
                        onBalanceUpdated={fetchItems}
                      />
                    )}
                  </>
                );
              })}
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

    </div>
  );
}
