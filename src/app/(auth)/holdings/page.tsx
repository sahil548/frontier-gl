"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  CreditCard,
  Wrench,
  Home,
  Building,
  FileText,
  ExternalLink,
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
import { ConnectBankFeed } from "@/components/holdings/connect-bank-feed";
import { InlineBankTransactions } from "@/components/holdings/inline-bank-transactions";
import { AddPositionsPrompt } from "@/components/holdings/add-positions-prompt";
import {
  HOLDING_TYPE_TO_GL,
  DEFAULT_POSITION_TYPE,
} from "@/lib/holdings/constants";

// ─── Types ──────────────────────────────────────────────

interface PositionSummary {
  id: string;
  name: string;
  accountId: string | null;
  positionType: string;
  marketValue: string;
}

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
  plaidConnection?: {
    status: "ACTIVE" | "ERROR" | "DISCONNECTED";
    institutionName: string | null;
    lastSyncAt: string | null;
    error: string | null;
  } | null;
  positions?: PositionSummary[];
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
  account?: { id: string; number: string; name: string } | null;
}

interface AccountOption {
  id: string;
  number: string;
  name: string;
  type: string;
}

// ─── Constants ──────────────────────────────────────────

// All 13 new canonical types + 3 legacy mappings
const ITEM_TYPES = [
  { value: "BANK_ACCOUNT", label: "Bank Account", icon: Landmark },
  { value: "BROKERAGE_ACCOUNT", label: "Brokerage Account", icon: TrendingUp },
  { value: "CREDIT_CARD", label: "Credit Card", icon: CreditCard },
  { value: "REAL_ESTATE", label: "Real Estate", icon: Building2 },
  { value: "EQUIPMENT", label: "Equipment", icon: Wrench },
  { value: "LOAN", label: "Loan", icon: Wallet },
  { value: "PRIVATE_FUND", label: "Private Fund", icon: TrendingUp },
  { value: "MORTGAGE", label: "Mortgage", icon: Home },
  { value: "LINE_OF_CREDIT", label: "Line of Credit", icon: Wallet },
  { value: "TRUST_ACCOUNT", label: "Trust Account", icon: ShieldCheck },
  { value: "OPERATING_BUSINESS", label: "Operating Business", icon: Building },
  { value: "NOTES_RECEIVABLE", label: "Notes Receivable", icon: FileText },
  { value: "OTHER", label: "Other", icon: BarChart2 },
  // Legacy types (display only for existing data)
  { value: "INVESTMENT", label: "Investment (Legacy)", icon: TrendingUp },
  { value: "PRIVATE_EQUITY", label: "Private Equity (Legacy)", icon: TrendingUp },
  { value: "RECEIVABLE", label: "Receivable (Legacy)", icon: Wallet },
];

// Only canonical 13 types shown in the creation form
const NEW_ITEM_TYPES = ITEM_TYPES.filter(
  (t) => !["INVESTMENT", "PRIVATE_EQUITY", "RECEIVABLE"].includes(t.value)
);

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.label])
);

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = Object.fromEntries(
  ITEM_TYPES.map((t) => [t.value, t.icon])
);

const TYPE_COLORS: Record<string, string> = {
  BANK_ACCOUNT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  BROKERAGE_ACCOUNT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  CREDIT_CARD: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  REAL_ESTATE: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  EQUIPMENT: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  LOAN: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  PRIVATE_FUND: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200",
  MORTGAGE: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  LINE_OF_CREDIT: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  TRUST_ACCOUNT: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  OPERATING_BUSINESS: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  NOTES_RECEIVABLE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  OTHER: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  // Legacy colors
  INVESTMENT: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  PRIVATE_EQUITY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  RECEIVABLE: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export const POSITION_TYPES = [
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

export const POSITION_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  POSITION_TYPES.map((t) => [t.value, t.label])
);

// Position types where quantity/price make sense
export const QUANTIFIABLE_TYPES = new Set([
  "PUBLIC_EQUITY",
  "FIXED_INCOME",
  "MUTUAL_FUND",
  "ETF",
  "PRIVATE_EQUITY",
]);

type FilterTab = "all" | string;

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "BANK_ACCOUNT", label: "Bank Accounts" },
  { value: "BROKERAGE_ACCOUNT", label: "Brokerage" },
  { value: "CREDIT_CARD", label: "Credit Cards" },
  { value: "REAL_ESTATE", label: "Real Estate" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "LOAN", label: "Loans" },
  { value: "PRIVATE_FUND", label: "Private Funds" },
  { value: "MORTGAGE", label: "Mortgages" },
  { value: "LINE_OF_CREDIT", label: "Lines of Credit" },
  { value: "TRUST_ACCOUNT", label: "Trust Accounts" },
  { value: "OPERATING_BUSINESS", label: "Operating Businesses" },
  { value: "NOTES_RECEIVABLE", label: "Notes Receivable" },
  { value: "OTHER", label: "Other" },
];

// GL parent mapping from shared constants (for display in form)
const HOLDING_GL_PARENT: Record<string, { number: string; label: string }> = {
  BANK_ACCOUNT: { number: "11000", label: "Cash & Cash Equivalents" },
  BROKERAGE_ACCOUNT: { number: "12000", label: "Brokerage Accounts" },
  CREDIT_CARD: { number: "21000", label: "Credit Cards" },
  REAL_ESTATE: { number: "16000", label: "Property, Plant & Equipment" },
  EQUIPMENT: { number: "17000", label: "Equipment" },
  LOAN: { number: "22000", label: "Loans Payable" },
  PRIVATE_FUND: { number: "13000", label: "Private Investments" },
  MORTGAGE: { number: "23000", label: "Mortgages" },
  LINE_OF_CREDIT: { number: "24000", label: "Lines of Credit" },
  TRUST_ACCOUNT: { number: "12500", label: "Trust Accounts" },
  OPERATING_BUSINESS: { number: "18000", label: "Operating Businesses" },
  NOTES_RECEIVABLE: { number: "14000", label: "Notes Receivable" },
  OTHER: { number: "19000", label: "Other Long-Term Assets" },
  // Legacy
  INVESTMENT: { number: "12000", label: "Investments" },
  PRIVATE_EQUITY: { number: "13000", label: "Private Investments" },
  RECEIVABLE: { number: "14000", label: "Receivables" },
};

// ─── Aggregate helpers ─────────────────────────────────

/** Compute aggregate totals from a holding's positions array */
function holdingAggregates(item: HoldingItem) {
  const positions = item.positions ?? [];
  const totalMV = positions.reduce(
    (s, p) => s + parseFloat(p.marketValue || "0"),
    0
  );
  // Use currentBalance as a fallback for cost basis aggregation
  const totalBalance = parseFloat(item.currentBalance || "0");
  const totalCostBasis = item.costBasis ? parseFloat(item.costBasis) : 0;
  return { totalMV, totalBalance, totalCostBasis, posCount: positions.length };
}

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

  // Compute market value from qty x unit price when both entered
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
      <TableCell colSpan={8} className="py-0 px-0">
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
                  <DialogTitle>Add Position -- {item.name}</DialogTitle>
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
            <div className="px-4 pb-3 text-sm text-muted-foreground animate-pulse">Loading positions...</div>
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
                    <th className="text-left py-1.5 font-medium text-muted-foreground">GL Account</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Ticker</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Qty</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Unit Cost</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Unit Price</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Cost Basis</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Market Value</th>
                    <th className="text-right py-1.5 font-medium text-muted-foreground">Gain/Loss</th>
                    <th className="text-left py-1.5 font-medium text-muted-foreground">Asset Class</th>
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
                        <td className="py-1.5">
                          <div>
                            <span className="font-medium">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-1.5">
                          {p.account ? (
                            <span className="font-mono text-xs text-muted-foreground">{p.account.number}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
                        </td>
                        <td className="py-1.5 text-muted-foreground text-xs">{POSITION_TYPE_LABELS[p.positionType] ?? p.positionType}</td>
                        <td className="py-1.5 font-mono text-xs text-muted-foreground">{p.ticker ?? "--"}</td>
                        <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">
                          {p.quantity ? parseFloat(p.quantity).toLocaleString() : "--"}
                        </td>
                        <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">
                          {p.unitCost ? formatCurrency(parseFloat(p.unitCost)) : "--"}
                        </td>
                        <td className="py-1.5 text-right font-mono text-xs text-muted-foreground">
                          {p.unitPrice ? formatCurrency(parseFloat(p.unitPrice)) : "--"}
                        </td>
                        <td className="py-1.5 text-right font-mono text-xs">
                          {cb > 0 ? formatCurrency(cb) : "--"}
                        </td>
                        <td className="py-1.5 text-right font-mono font-medium">
                          {formatCurrency(mv)}
                        </td>
                        <td className={cn("py-1.5 text-right font-mono text-xs", pnl === null ? "text-muted-foreground" : pnl >= 0 ? "text-green-600" : "text-red-600")}>
                          {pnl !== null ? `${pnl >= 0 ? "+" : ""}${formatCurrency(pnl)}` : "--"}
                        </td>
                        <td className="py-1.5">
                          {p.assetClass ? (
                            <Badge variant="outline" className="text-xs">{p.assetClass}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">--</span>
                          )}
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
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<HoldingItem | null>(null);

  // AddPositionsPrompt state -- triggered after holding creation
  const [promptHolding, setPromptHolding] = useState<{ id: string; name: string; type: string } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("BANK_ACCOUNT");
  const [formBalance, setFormBalance] = useState("");
  const [formCounterparty, setFormCounterparty] = useState("");
  const [formRef, setFormRef] = useState("");
  const [formCostBasis, setFormCostBasis] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formOpeningBalanceDate, setFormOpeningBalanceDate] = useState("");
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

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // ─── Handlers ──────────────────────────────────────

  function resetForm() {
    setFormName(""); setFormType("BANK_ACCOUNT");
    setFormBalance(""); setFormCounterparty(""); setFormRef("");
    setFormCostBasis(""); setFormNotes(""); setFormOpeningBalanceDate("");
  }

  function openEdit(item: HoldingItem) {
    setFormName(item.name);
    setFormType(item.itemType);
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

  function toggleGroup(type: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }

  async function handleSave() {
    if (!formName.trim()) return;
    const isEdit = !!editItem;
    const balance = parseFloat(formBalance) || 0;

    // Validate: date required when creating with non-zero balance
    if (!isEdit && balance !== 0 && !formOpeningBalanceDate) {
      toast.error("Date required for opening balance");
      return;
    }

    setSaving(true);
    const url = isEdit
      ? `/api/entities/${currentEntityId}/subledger/${editItem.id}`
      : `/api/entities/${currentEntityId}/subledger`;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          itemType: formType,
          currentBalance: balance,
          counterparty: formCounterparty.trim() || undefined,
          referenceNumber: formRef.trim() || undefined,
          costBasis: formCostBasis ? parseFloat(formCostBasis) : undefined,
          notes: formNotes.trim() || undefined,
          ...(!isEdit && formOpeningBalanceDate ? { openingBalanceDate: formOpeningBalanceDate } : {}),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        if (isEdit) {
          toast.success("Holding updated");
          setEditItem(null);
        } else {
          if (json.data.openingBalanceJEId) {
            toast.success("Holding created with opening balance journal entry");
          } else {
            toast.success("Holding created");
          }
          // After creation, trigger the AddPositionsPrompt
          setPromptHolding({
            id: json.data.id,
            name: json.data.name,
            type: json.data.itemType,
          });
        }
        setAddOpen(false);
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

  // Filter holdings by tab
  const filtered =
    filter === "all"
      ? items
      : items.filter((i) => i.itemType === filter);

  // Group filtered holdings by itemType
  const grouped = new Map<string, HoldingItem[]>();
  for (const item of filtered) {
    const list = grouped.get(item.itemType) ?? [];
    list.push(item);
    grouped.set(item.itemType, list);
  }

  // Determine order: use FILTER_TABS order (skip "all"), then any remaining types
  const typeOrder = FILTER_TABS.filter((t) => t.value !== "all").map((t) => t.value);
  const orderedTypes = typeOrder.filter((t) => grouped.has(t));
  // Add any types present in data but not in the tabs (e.g., legacy types)
  for (const t of grouped.keys()) {
    if (!orderedTypes.includes(t)) orderedTypes.push(t);
  }

  // Compute summary card data (group liabilities vs assets)
  const assetItems = items.filter((i) => {
    const gl = HOLDING_TYPE_TO_GL[i.itemType];
    return !gl || gl.accountType === "ASSET";
  });
  const liabilityItems = items.filter((i) => {
    const gl = HOLDING_TYPE_TO_GL[i.itemType];
    return gl && gl.accountType === "LIABILITY";
  });

  const sumMV = (arr: HoldingItem[]) =>
    arr.reduce((s, i) => {
      const agg = holdingAggregates(i);
      return s + (agg.posCount > 0 ? agg.totalMV : parseFloat(i.currentBalance || "0"));
    }, 0);

  const totalAssets = sumMV(assetItems);
  const totalLiabilities = sumMV(liabilityItems);

  const showCostBasis = ["BROKERAGE_ACCOUNT", "INVESTMENT", "REAL_ESTATE", "PRIVATE_EQUITY", "PRIVATE_FUND", "EQUIPMENT", "OPERATING_BUSINESS"].includes(formType);

  // All holdings can have positions expanded
  const canExpand = () => true;

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
              {NEW_ITEM_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">GL Category</Label>
          <p className="text-sm font-medium pt-2">
            {HOLDING_GL_PARENT[formType]?.number} -- {HOLDING_GL_PARENT[formType]?.label}
          </p>
          <p className="text-xs text-muted-foreground">
            A GL account will be created automatically
          </p>
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
      {/* Opening Balance Date -- only on creation when balance is non-zero */}
      {!editItem && parseFloat(formBalance) !== 0 && formBalance !== "" && (
        <div className="space-y-2">
          <Label>Opening Balance Date</Label>
          <Input
            type="date"
            value={formOpeningBalanceDate}
            onChange={(e) => setFormOpeningBalanceDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Date for the opening balance journal entry
          </p>
        </div>
      )}
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
              <Button onClick={handleSave} disabled={saving || !formName.trim()}>
                {saving ? "Adding..." : "Add Holding"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-600">{formatCurrency(totalAssets)}</div>
            <p className="text-xs text-muted-foreground">{assetItems.length} holding{assetItems.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Liabilities</CardTitle>
            <Wallet className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatCurrency(totalLiabilities)}</div>
            <p className="text-xs text-muted-foreground">{liabilityItems.length} holding{liabilityItems.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
            <BarChart2 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-xl font-bold", totalAssets - totalLiabilities >= 0 ? "text-blue-600" : "text-red-600")}>
              {formatCurrency(totalAssets - totalLiabilities)}
            </div>
            <p className="text-xs text-muted-foreground">{items.length} total holding{items.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {FILTER_TABS.map((tab) => {
          const count = tab.value === "all"
            ? items.length
            : items.filter((i) => i.itemType === tab.value).length;
          // Only show tabs that have holdings (plus "all")
          if (tab.value !== "all" && count === 0) return null;
          return (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                filter === tab.value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.value !== "all" && (
                <span className="ml-1.5 text-xs text-muted-foreground">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Grouped holdings sections */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-5 w-40 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="h-12 rounded-md bg-muted" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border py-12 text-center">
          <p className="text-muted-foreground">No holdings found. Add one to get started.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Holding
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {orderedTypes.map((type) => {
            const groupItems = grouped.get(type) ?? [];
            if (groupItems.length === 0) return null;
            const isCollapsed = collapsedGroups.has(type);
            const IconComp = TYPE_ICONS[type] ?? BarChart2;
            const groupLabel = TYPE_LABELS[type] ?? type;
            const groupColor = TYPE_COLORS[type] ?? "";
            const groupTotalMV = groupItems.reduce((s, i) => {
              const agg = holdingAggregates(i);
              return s + (agg.posCount > 0 ? agg.totalMV : parseFloat(i.currentBalance || "0"));
            }, 0);

            return (
              <Card key={type}>
                <CardHeader className="pb-3">
                  <button
                    onClick={() => toggleGroup(type)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center gap-3">
                      {isCollapsed
                        ? <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      <IconComp className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{groupLabel}</CardTitle>
                      <Badge variant="secondary" className={cn("text-xs", groupColor)}>
                        {groupItems.length}
                      </Badge>
                    </div>
                    <span className="font-mono text-sm font-medium">
                      {formatCurrency(groupTotalMV)}
                    </span>
                  </button>
                </CardHeader>
                {!isCollapsed && (
                  <CardContent className="pt-0">
                    <div className="overflow-x-auto rounded-md border">
                      <Table className="w-max min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8" />
                            <TableHead className="sticky left-0 z-10 bg-background">Name</TableHead>
                            <TableHead>GL Account</TableHead>
                            <TableHead>Counterparty</TableHead>
                            <TableHead className="text-right">Positions</TableHead>
                            <TableHead className="text-right">Market Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groupItems.map((item) => {
                            const isExpanded = expandedIds.has(item.id);
                            const expandable = canExpand();
                            const agg = holdingAggregates(item);
                            const displayMV = agg.posCount > 0 ? agg.totalMV : parseFloat(item.currentBalance || "0");

                            return (
                              <React.Fragment key={item.id}>
                                <TableRow className={cn(isExpanded && "bg-muted/20")}>
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
                                      {item.itemType === "BANK_ACCOUNT" ? (
                                        <button
                                          onClick={() => router.push(`/bank-feed?subledgerItemId=${item.id}`)}
                                          className="text-primary hover:underline text-left"
                                        >
                                          {item.name}
                                        </button>
                                      ) : (
                                        item.name
                                      )}
                                      {item.itemType === "BANK_ACCOUNT" && (
                                        <button
                                          onClick={() => router.push(`/bank-feed?subledgerItemId=${item.id}`)}
                                          className="text-muted-foreground hover:text-primary"
                                          title="View Bank Feed"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {item.account && (
                                      <button
                                        onClick={() => window.location.href = `/gl-ledger/${item.account!.id}`}
                                        className="text-sm text-primary hover:underline font-mono"
                                      >
                                        {item.account.number}
                                      </button>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {item.counterparty ?? "--"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Badge variant="outline" className="text-xs font-mono">
                                      {agg.posCount}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-sm font-medium">
                                    {formatCurrency(displayMV)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-1">
                                      {item._reconciliationCount > 0 ? (
                                        <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                          <ShieldCheck className="h-3 w-3" /> Reconciled
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="gap-1 text-xs">
                                          <AlertCircle className="h-3 w-3" /> Unreconciled
                                        </Badge>
                                      )}
                                      {item.itemType === "BANK_ACCOUNT" && (
                                        <ConnectBankFeed
                                          subledgerItemId={item.id}
                                          connectionStatus={item.plaidConnection?.status ?? null}
                                          institutionName={item.plaidConnection?.institutionName}
                                          lastSyncAt={item.plaidConnection?.lastSyncAt}
                                          error={item.plaidConnection?.error}
                                          onSyncComplete={fetchItems}
                                        />
                                      )}
                                    </div>
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
                                  <>
                                    <PositionsRow
                                      key={`pos-${item.id}`}
                                      entityId={currentEntityId}
                                      item={item}
                                      onBalanceUpdated={fetchItems}
                                    />
                                    {item.itemType === "BANK_ACCOUNT" && (
                                      <TableRow key={`txns-${item.id}`}>
                                        <TableCell colSpan={8} className="p-0">
                                          <div className="border-t bg-muted/10 px-6 py-4">
                                            <h4 className="text-sm font-medium mb-3">Recent Transactions</h4>
                                            <InlineBankTransactions entityId={currentEntityId} subledgerItemId={item.id} />
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    )}
                                  </>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
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

      {/* Add Positions Prompt -- shown after holding creation */}
      {promptHolding && (
        <AddPositionsPrompt
          entityId={currentEntityId}
          holdingId={promptHolding.id}
          holdingName={promptHolding.name}
          holdingType={promptHolding.type}
          open={!!promptHolding}
          onClose={() => setPromptHolding(null)}
          onPositionsAdded={() => {
            setPromptHolding(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}
