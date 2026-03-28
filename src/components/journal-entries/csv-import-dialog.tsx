"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
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

interface CsvImportDialogProps {
  entityId: string;
  onSuccess: () => void;
}

export function CsvImportDialog({ entityId, onSuccess }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      // Parse preview (first 6 rows including header)
      const lines = text.trim().split("\n").slice(0, 6);
      setPreview(lines.map((line) => line.split(",").map((c) => c.trim().replace(/"/g, ""))));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText) return;
    setImporting(true);

    try {
      const res = await fetch(`/api/entities/${entityId}/journal-entries/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(`Imported ${json.data.imported} journal entries as drafts`);
        setOpen(false);
        setCsvText("");
        setPreview([]);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="mr-2 h-4 w-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Journal Entries from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: date, description, account (number), debit, credit, memo (optional).
            Rows with the same date and description are grouped into a single journal entry.
            All entries are created as drafts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleImport} disabled={!csvText || importing}>
            {importing ? "Importing..." : "Import as Drafts"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
