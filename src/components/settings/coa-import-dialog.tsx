"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ColumnMappingUI } from "@/components/csv-import/column-mapping-ui";

interface CoaImportDialogProps {
  entityId: string;
  onSuccess: () => void;
}

export function CoaImportDialog({ entityId, onSuccess }: CoaImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);

  // Column mapping state
  const [showMapping, setShowMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSampleRows, setCsvSampleRows] = useState<string[][]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      // Parse preview (first 6 rows including header)
      const lines = text.trim().split("\n").slice(0, 6);
      setPreview(
        lines.map((line) => line.split(",").map((c) => c.trim().replace(/"/g, "")))
      );

      // Parse for column mapping UI
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      });

      if (parsed.meta.fields && parsed.meta.fields.length > 0) {
        setCsvHeaders(parsed.meta.fields);
        const rows = parsed.data.slice(0, 5).map((row) =>
          parsed.meta.fields!.map((h) => row[h] ?? "")
        );
        setCsvSampleRows(rows);
      }
    };
    reader.readAsText(file);
  };

  const handleShowMapping = () => {
    if (!csvText) return;
    setShowMapping(true);
  };

  const handleMappingConfirm = async (mapping: Record<string, string>) => {
    setShowMapping(false);
    setImporting(true);

    try {
      const res = await fetch(`/api/entities/${entityId}/accounts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText, columnMapping: mapping }),
      });
      const json = await res.json();

      if (json.success) {
        const { created, skipped } = json.data;
        toast.success(
          `Imported ${created} account${created !== 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} skipped (already exist)` : ""}`
        );
        setOpen(false);
        setCsvText("");
        setPreview([]);
        setCsvHeaders([]);
        setCsvSampleRows([]);
        onSuccess();
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Failed to import CSV");
    } finally {
      setImporting(false);
    }
  };

  const handleMappingCancel = () => {
    setShowMapping(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="mr-2 h-4 w-4" />
        Import Chart of Accounts
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="sticky top-0 bg-background z-10 pb-2">
          <DialogTitle>Import Chart of Accounts from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: number, name, type, description
            (optional), parentNumber (optional). Type must be one of ASSET,
            LIABILITY, EQUITY, INCOME, or EXPENSE. Accounts with numbers that
            already exist will be skipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!showMapping && (
            <>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
              />

              {preview.length > 0 && (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {preview[0].map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(1).map((row, i) => (
                        <tr key={i} className="border-b">
                          {row.map((cell, j) => (
                            <td key={j} className="px-3 py-2">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Showing first {Math.min(preview.length - 1, 5)} rows of{" "}
                    {csvText.trim().split("\n").length - 1} total
                  </p>
                </div>
              )}
            </>
          )}

          {showMapping && csvHeaders.length > 0 && (
            <ColumnMappingUI
              headers={csvHeaders}
              sampleRows={csvSampleRows}
              importType="coa"
              entityId={entityId}
              onConfirm={handleMappingConfirm}
              onCancel={handleMappingCancel}
            />
          )}
        </div>

        {!showMapping && (
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleShowMapping} disabled={!csvText || importing}>
              {importing ? "Importing..." : "Review Column Mapping"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
