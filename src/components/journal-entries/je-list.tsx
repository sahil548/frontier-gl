"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import {
  Pencil,
  Trash2,
  CheckCircle,
  Send,
  RotateCcw,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { JEStatusBadge } from "./je-status-badge";
import { JEBulkActionBar } from "./je-bulk-action-bar";

type SerializedLineItem = {
  debit: string;
  credit: string;
};

type SerializedJournalEntry = {
  id: string;
  entryNumber: string;
  date: string;
  description: string;
  status: string;
  lineItems?: SerializedLineItem[];
};

type JEListProps = {
  entityId: string;
};

type TabData = {
  entries: SerializedJournalEntry[];
  total: number;
  page: number;
  isLoading: boolean;
};

/**
 * Format a date ISO string to localized display.
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Compute total amount (sum of debits) from line items.
 */
function computeTotalAmount(lineItems?: SerializedLineItem[]): string {
  if (!lineItems || lineItems.length === 0) return "$0.00";
  const total = lineItems.reduce(
    (sum, li) => sum.plus(new Decimal(li.debit || "0")),
    new Decimal(0)
  );
  const formatted = total.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `$${formatted}`;
}

const STATUSES = ["DRAFT", "APPROVED", "POSTED"] as const;

/**
 * Tabbed journal entry list with Draft/Approved/Posted tabs,
 * checkbox selection, bulk action bar, and individual row actions.
 */
export function JEList({ entityId }: JEListProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>("DRAFT");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<SerializedJournalEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data for each tab
  const [tabData, setTabData] = useState<Record<string, TabData>>({
    DRAFT: { entries: [], total: 0, page: 1, isLoading: true },
    APPROVED: { entries: [], total: 0, page: 1, isLoading: true },
    POSTED: { entries: [], total: 0, page: 1, isLoading: true },
  });

  const fetchTab = useCallback(
    async (status: string, page = 1) => {
      setTabData((prev) => ({
        ...prev,
        [status]: { ...prev[status], isLoading: true },
      }));

      try {
        const res = await fetch(
          `/api/entities/${entityId}/journal-entries?status=${status}&page=${page}&limit=50`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setTabData((prev) => ({
              ...prev,
              [status]: {
                entries: json.data.entries,
                total: json.data.total,
                page: json.data.page,
                isLoading: false,
              },
            }));
          }
        }
      } catch {
        // silently fail
      } finally {
        setTabData((prev) => ({
          ...prev,
          [status]: { ...prev[status], isLoading: false },
        }));
      }
    },
    [entityId]
  );

  // Fetch all tabs on mount
  useEffect(() => {
    for (const status of STATUSES) {
      fetchTab(status);
    }
  }, [fetchTab]);

  const refreshAll = useCallback(() => {
    setSelectedIds([]);
    for (const status of STATUSES) {
      fetchTab(status);
    }
  }, [fetchTab]);

  const currentTabData = tabData[activeTab];
  const currentEntries = currentTabData?.entries ?? [];
  const showCheckboxes = activeTab !== "POSTED";

  // Selection handlers
  const handleSelectAll = () => {
    if (selectedIds.length === currentEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentEntries.map((e) => e.id));
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Clear selection when switching tabs
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedIds([]);
  };

  // Individual actions
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Journal entry deleted");
        setDeleteTarget(null);
        refreshAll();
      } else {
        toast.error(json.error || "Failed to delete");
      }
    } catch {
      toast.error("Failed to delete entry");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${id}/approve`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Entry approved");
        refreshAll();
      } else {
        toast.error(json.error || "Failed to approve");
      }
    } catch {
      toast.error("Failed to approve entry");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePost = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${id}/post`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Entry posted");
        refreshAll();
      } else {
        toast.error(json.error || "Failed to post");
      }
    } catch {
      toast.error("Failed to post entry");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReverse = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(
        `/api/entities/${entityId}/journal-entries/${id}/reverse`,
        { method: "POST" }
      );
      const json = await res.json();
      if (json.success) {
        toast.success("Reversal draft created");
        router.push(`/journal-entries/${json.data.id}`);
      } else {
        toast.error(json.error || "Failed to reverse");
      }
    } catch {
      toast.error("Failed to reverse entry");
    } finally {
      setActionLoading(null);
    }
  };

  // Pagination
  const totalPages = Math.ceil((currentTabData?.total ?? 0) / 50);
  const currentPage = currentTabData?.page ?? 1;

  const renderTable = (status: string) => {
    const data = tabData[status];
    if (!data) return null;

    if (data.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading entries...</p>
        </div>
      );
    }

    if (data.entries.length === 0) {
      const emptyText =
        status === "DRAFT"
          ? "No draft entries"
          : status === "APPROVED"
            ? "No approved entries"
            : "No posted entries";
      return (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">{emptyText}</p>
        </div>
      );
    }

    const showCheck = status !== "POSTED";

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              {showCheck && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      selectedIds.length === data.entries.length &&
                      data.entries.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px]">Entry #</TableHead>
              <TableHead className="w-[110px]">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px] text-right">Amount</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[140px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.entries.map((entry) => (
              <TableRow
                key={entry.id}
                className="cursor-pointer group"
                onClick={() => router.push(`/journal-entries/${entry.id}`)}
              >
                {showCheck && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(entry.id)}
                      onCheckedChange={() => handleSelectEntry(entry.id)}
                      aria-label={`Select ${entry.entryNumber}`}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium font-mono text-xs">
                  {entry.entryNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(entry.date)}
                </TableCell>
                <TableCell className="text-sm max-w-[300px] truncate">
                  {entry.description}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {computeTotalAmount(entry.lineItems)}
                </TableCell>
                <TableCell>
                  <JEStatusBadge status={entry.status} />
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {/* Draft actions */}
                    {status === "DRAFT" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            router.push(`/journal-entries/${entry.id}`)
                          }
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setDeleteTarget(entry)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleApprove(entry.id)}
                          disabled={actionLoading === entry.id}
                          aria-label="Approve"
                        >
                          {actionLoading === entry.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handlePost(entry.id)}
                          disabled={actionLoading === entry.id}
                          aria-label="Post"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}

                    {/* Approved actions */}
                    {status === "APPROVED" && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handlePost(entry.id)}
                        disabled={actionLoading === entry.id}
                        aria-label="Post"
                      >
                        {actionLoading === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}

                    {/* Posted actions */}
                    {status === "POSTED" && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleReverse(entry.id)}
                        disabled={actionLoading === entry.id}
                        aria-label="Reverse"
                      >
                        {actionLoading === entry.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3">
            <p className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({data.total} entries)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => fetchTab(status, currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => fetchTab(status, currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <Tabs defaultValue="DRAFT" onValueChange={handleTabChange}>
        <TabsList variant="line">
          {STATUSES.map((status) => (
            <TabsTrigger key={status} value={status}>
              {status === "DRAFT" ? "Draft" : status === "APPROVED" ? "Approved" : "Posted"}
              <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1.5">
                {tabData[status]?.total ?? 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUSES.map((status) => (
          <TabsContent key={status} value={status}>
            {renderTable(status)}
          </TabsContent>
        ))}
      </Tabs>

      {/* Bulk action bar */}
      <JEBulkActionBar
        selectedIds={selectedIds}
        activeTab={activeTab}
        entityId={entityId}
        onComplete={refreshAll}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Journal Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.entryNumber}? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
