"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Pencil, Square, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecurringTemplateLine = {
  id: string;
  accountId: string;
  accountName: string;
  accountNumber: string;
  debit: string;
  credit: string;
  memo: string;
  sortOrder: number;
};

export type RecurringTemplate = {
  id: string;
  name: string;
  description: string | null;
  frequency: string | null;
  isRecurring: boolean;
  nextRunDate: string | null;
  lastRunDate: string | null;
  status: "active" | "overdue" | "stopped";
  lines: RecurringTemplateLine[];
};

type RecurringTemplatesTableProps = {
  templates: RecurringTemplate[];
  onGenerate: () => void;
  onEdit: (template: RecurringTemplate) => void;
  onStop: (templateId: string) => void;
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  overdue: "secondary",
  stopped: "outline",
};

function formatFrequency(freq: string | null): string {
  if (!freq) return "-";
  return freq.charAt(0).toUpperCase() + freq.slice(1);
}

function formatDateStr(dateStr: string | null): string {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return dateStr;
  }
}

export function RecurringTemplatesTable({
  templates,
  onEdit,
  onStop,
}: RecurringTemplatesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<RecurringTemplate>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("name")}</span>
        ),
      },
      {
        accessorKey: "frequency",
        header: "Frequency",
        cell: ({ row }) => formatFrequency(row.getValue("frequency")),
      },
      {
        accessorKey: "nextRunDate",
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Next Run
            <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ),
        cell: ({ row }) => formatDateStr(row.getValue("nextRunDate")),
      },
      {
        accessorKey: "lastRunDate",
        header: "Last Run",
        cell: ({ row }) => formatDateStr(row.getValue("lastRunDate")),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const template = row.original;
          return (
            <div className="flex items-center gap-1">
              {template.status !== "stopped" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onEdit(template)}
                    aria-label="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => onStop(template.id)}
                    aria-label="Stop"
                  >
                    <Square className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [onEdit, onStop]
  );

  const table = useReactTable({
    data: templates,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">
          No recurring templates. Set up recurring from a JE template.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
