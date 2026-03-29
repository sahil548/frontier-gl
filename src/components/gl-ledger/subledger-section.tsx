"use client";

import { useState, useEffect } from "react";
import { Plus, Building2, Landmark, TrendingUp, Wallet, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCurrency } from "@/lib/utils/accounting";

interface SubledgerItem {
  id: string;
  name: string;
  itemType: string;
  costBasis: string | null;
  fairMarketValue: string | null;
  currentBalance: string;
  counterparty: string | null;
  referenceNumber: string | null;
  acquiredDate: string | null;
  notes: string | null;
  _reconciliationCount: number;
}

const ITEM_TYPE_LABELS: Record<string, string> = {
  BANK_ACCOUNT: "Bank Account",
  INVESTMENT: "Investment",
  REAL_ESTATE: "Real Estate",
  LOAN: "Loan",
  PRIVATE_EQUITY: "Private Equity",
  RECEIVABLE: "Receivable",
  OTHER: "Other",
};

const ITEM_TYPE_ICONS: Record<string, typeof Landmark> = {
  BANK_ACCOUNT: Landmark,
  INVESTMENT: TrendingUp,
  REAL_ESTATE: Building2,
  LOAN: Wallet,
  PRIVATE_EQUITY: TrendingUp,
  RECEIVABLE: Wallet,
  OTHER: Wallet,
};

interface SubledgerSectionProps {
  entityId: string;
  accountId: string;
  accountType: string;
}

export function SubledgerSection({ entityId, accountId, accountType }: SubledgerSectionProps) {
  const [items, setItems] = useState<SubledgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [reconOpen, setReconOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("OTHER");
  const [newBalance, setNewBalance] = useState("");
  const [newCounterparty, setNewCounterparty] = useState("");
  const [newRef, setNewRef] = useState("");

  // Recon form state
  const [reconDate, setReconDate] = useState(new Date().toISOString().split("T")[0]);
  const [reconBalance, setReconBalance] = useState("");
  const [reconSaving, setReconSaving] = useState(false);

  const isApplicable = ["ASSET", "LIABILITY"].includes(accountType);

  useEffect(() => {
    if (!isApplicable) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/entities/${entityId}/subledger?accountId=${accountId}`
        );
        if (res.ok && !cancelled) {
          const json = await res.json();
          if (json.success) setItems(json.data);
        }
      } catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [entityId, accountId, isApplicable]);

  async function fetchItems() {
    try {
      const res = await fetch(
        `/api/entities/${entityId}/subledger?accountId=${accountId}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) setItems(json.data);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  async function addItem() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/entities/${entityId}/subledger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          name: newName.trim(),
          itemType: newType,
          currentBalance: parseFloat(newBalance) || 0,
          counterparty: newCounterparty.trim() || undefined,
          referenceNumber: newRef.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success(`Added ${newName}`);
        setAddOpen(false);
        setNewName("");
        setNewBalance("");
        setNewCounterparty("");
        setNewRef("");
        fetchItems();
      } else {
        toast.error(json.error ?? "Failed to add");
      }
    } catch {
      toast.error("Failed to add holding");
    } finally {
      setSaving(false);
    }
  }

  async function reconcileItem(itemId: string) {
    if (!reconBalance) return;
    setReconSaving(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/subledger/${itemId}/reconcile`,
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
        const diff = parseFloat(json.data.difference);
        if (Math.abs(diff) < 0.005) {
          toast.success("Reconciled — GL matches statement");
        } else {
          toast.warning(`Difference of ${formatCurrency(diff)} — review needed`);
        }
        setReconOpen(null);
        setReconBalance("");
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

  if (!isApplicable) return null;
  if (loading) return null;

  const totalBalance = items.reduce(
    (sum, item) => sum + parseFloat(item.currentBalance || "0"),
    0
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Holdings & Subledger
            </CardTitle>
            <CardDescription>
              {items.length === 0
                ? "Track individual assets, bank accounts, or liabilities under this GL account"
                : `${items.length} item${items.length !== 1 ? "s" : ""} — Total: ${formatCurrency(totalBalance)}`}
            </CardDescription>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger render={<Button variant="outline" size="sm" />}>
              <Plus className="mr-1 h-3 w-3" />
              Add
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Subledger Item</DialogTitle>
                <DialogDescription>
                  Track a specific holding, bank account, or liability.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Chase Operating #4421"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newType} onValueChange={(v) => setNewType(v as string)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Current Balance / Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Counterparty</Label>
                    <Input
                      value={newCounterparty}
                      onChange={(e) => setNewCounterparty(e.target.value)}
                      placeholder="e.g., Chase Bank"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference #</Label>
                    <Input
                      value={newRef}
                      onChange={(e) => setNewRef(e.target.value)}
                      placeholder="e.g., #4421"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={addItem} disabled={saving || !newName.trim()}>
                  {saving ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      {items.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {items.map((item) => {
              const Icon = ITEM_TYPE_ICONS[item.itemType] ?? Wallet;
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}</span>
                        {item.counterparty && (
                          <>
                            <span>·</span>
                            <span>{item.counterparty}</span>
                          </>
                        )}
                        {item.referenceNumber && (
                          <>
                            <span>·</span>
                            <span>{item.referenceNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">
                      {formatCurrency(parseFloat(item.currentBalance))}
                    </span>

                    {item._reconciliationCount > 0 ? (
                      <Badge variant="secondary" className="gap-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <ShieldCheck className="h-3 w-3" />
                        Reconciled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Not reconciled
                      </Badge>
                    )}

                    <Dialog
                      open={reconOpen === item.id}
                      onOpenChange={(open) => setReconOpen(open ? item.id : null)}
                    >
                      <DialogTrigger
                        render={<Button variant="outline" size="sm" />}
                      >
                        Reconcile
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reconcile: {item.name}</DialogTitle>
                          <DialogDescription>
                            Enter the statement balance to compare against the GL.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Statement Date</Label>
                            <Input
                              type="date"
                              value={reconDate}
                              onChange={(e) => setReconDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Statement Balance</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={reconBalance}
                              onChange={(e) => setReconBalance(e.target.value)}
                              placeholder="Enter balance from statement"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={() => reconcileItem(item.id)}
                            disabled={reconSaving || !reconBalance}
                          >
                            {reconSaving ? "Reconciling..." : "Reconcile"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
