"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, CheckCircle, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── COA Templates ──────────────────────────────────────

const COA_TEMPLATES: Record<string, { name: string; description: string; csv: string }> = {
  "family-office": {
    name: "Family Office Standard",
    description: "Full COA for family offices: investments, real estate, K-1 allocations, management fees",
    csv: `number,name,type,parentNumber
10000,Assets,ASSET,
10100,Cash and Cash Equivalents,ASSET,10000
10200,Investment Accounts,ASSET,10000
10300,Receivables,ASSET,10000
10400,Other Assets,ASSET,10000
10500,Real Estate Holdings,ASSET,10000
10600,Private Equity Investments,ASSET,10000
10700,Prepaid Expenses,ASSET,10000
20000,Liabilities,LIABILITY,
20100,Accounts Payable,LIABILITY,20000
20200,Loans Payable,LIABILITY,20000
20300,Accrued Expenses,LIABILITY,20000
20400,Notes Payable,LIABILITY,20000
20500,Mortgage Payable,LIABILITY,20000
30000,Equity,EQUITY,
30100,Owner Equity,EQUITY,30000
30200,Retained Earnings,EQUITY,30000
30300,Distributions,EQUITY,30000
30400,Contributed Capital,EQUITY,30000
40000,Income,INCOME,
40100,Management Fees,INCOME,40000
40200,Realized Gains,INCOME,40000
40300,Unrealized Gains,INCOME,40000
40400,Dividend Income,INCOME,40000
40500,Interest Income,INCOME,40000
40600,K-1 Allocations,INCOME,40000
40700,Rental Income,INCOME,40000
40800,Other Income,INCOME,40000
50000,Expenses,EXPENSE,
50100,Management Fees Expense,EXPENSE,50000
50200,Legal and Professional,EXPENSE,50000
50300,Accounting and Tax,EXPENSE,50000
50400,Insurance,EXPENSE,50000
50500,Office Expenses,EXPENSE,50000
50600,Travel and Entertainment,EXPENSE,50000
50700,Bank Charges,EXPENSE,50000
50800,Depreciation,EXPENSE,50000
50900,Property Expenses,EXPENSE,50000
51000,Interest Expense,EXPENSE,50000
51100,Other Expenses,EXPENSE,50000`,
  },
  "real-estate": {
    name: "Real Estate Entity",
    description: "COA for real estate holding entities: properties, rental income, maintenance",
    csv: `number,name,type,parentNumber
10000,Assets,ASSET,
10100,Operating Cash,ASSET,10000
10200,Security Deposits Held,ASSET,10000
10300,Property - Land,ASSET,10000
10400,Property - Building,ASSET,10000
10500,Accumulated Depreciation,ASSET,10000
10600,Tenant Receivables,ASSET,10000
20000,Liabilities,LIABILITY,
20100,Accounts Payable,LIABILITY,20000
20200,Mortgage Payable,LIABILITY,20000
20300,Security Deposits Liability,LIABILITY,20000
20400,Accrued Property Tax,LIABILITY,20000
30000,Equity,EQUITY,
30100,Member Equity,EQUITY,30000
30200,Retained Earnings,EQUITY,30000
30300,Distributions,EQUITY,30000
40000,Income,INCOME,
40100,Rental Income,INCOME,40000
40200,Late Fee Income,INCOME,40000
40300,Other Income,INCOME,40000
50000,Expenses,EXPENSE,
50100,Property Management,EXPENSE,50000
50200,Repairs and Maintenance,EXPENSE,50000
50300,Property Insurance,EXPENSE,50000
50400,Property Taxes,EXPENSE,50000
50500,Utilities,EXPENSE,50000
50600,Depreciation Expense,EXPENSE,50000
50700,Mortgage Interest,EXPENSE,50000
50800,Legal and Professional,EXPENSE,50000
50900,Landscaping,EXPENSE,50000`,
  },
  "investment-fund": {
    name: "Investment Fund / LP",
    description: "COA for investment fund entities: securities, NAV, management/performance fees",
    csv: `number,name,type,parentNumber
10000,Assets,ASSET,
10100,Cash - Operating,ASSET,10000
10200,Cash - Brokerage,ASSET,10000
10300,Marketable Securities,ASSET,10000
10400,Private Investments,ASSET,10000
10500,Accrued Income,ASSET,10000
10600,Due from Broker,ASSET,10000
20000,Liabilities,LIABILITY,
20100,Accounts Payable,LIABILITY,20000
20200,Accrued Management Fee,LIABILITY,20000
20300,Accrued Performance Fee,LIABILITY,20000
20400,Redemptions Payable,LIABILITY,20000
20500,Due to Broker,LIABILITY,20000
30000,Equity,EQUITY,
30100,Partners Capital,EQUITY,30000
30200,Retained Earnings,EQUITY,30000
30300,Distributions,EQUITY,30000
40000,Income,INCOME,
40100,Realized Gains - Securities,INCOME,40000
40200,Unrealized Gains - Securities,INCOME,40000
40300,Dividend Income,INCOME,40000
40400,Interest Income,INCOME,40000
40500,Other Income,INCOME,40000
50000,Expenses,EXPENSE,
50100,Management Fee,EXPENSE,50000
50200,Performance Fee,EXPENSE,50000
50300,Brokerage Commissions,EXPENSE,50000
50400,Custody Fees,EXPENSE,50000
50500,Legal Fees,EXPENSE,50000
50600,Audit Fees,EXPENSE,50000
50700,Administration Fees,EXPENSE,50000
50800,Other Expenses,EXPENSE,50000`,
  },
  blank: {
    name: "Minimal / Blank",
    description: "Just the 5 top-level categories — build your own from scratch",
    csv: `number,name,type
10000,Assets,ASSET
20000,Liabilities,LIABILITY
30000,Equity,EQUITY
40000,Income,INCOME
50000,Expenses,EXPENSE`,
  },
};

// ─── Types ──────────────────────────────────────────────

type Step = "choose" | "upload" | "preview" | "done";

// ─── Main Page ──────────────────────────────────────────

export default function ImportPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();
  const [step, setStep] = useState<Step>("choose");
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<string[][]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

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
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="text-muted-foreground">Create an entity first.</p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Import</h1>
        <p className="text-muted-foreground">
          Select a specific entity to import data.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);

  // ─── Handlers ──────────────────────────────────────

  function selectTemplate(key: string) {
    const template = COA_TEMPLATES[key];
    if (!template) return;
    setSelectedTemplate(key);
    setCsvText(template.csv);
    parsePreview(template.csv);
    setStep("preview");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parsePreview(text);
      setSelectedTemplate(null);
      setStep("preview");
    };
    reader.readAsText(file);
  }

  function parsePreview(text: string) {
    const lines = text.trim().split("\n").slice(0, 8);
    setPreview(
      lines.map((line) =>
        line.split(",").map((c) => c.trim().replace(/"/g, ""))
      )
    );
  }

  async function runImport() {
    if (!csvText) return;
    setImporting(true);

    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/accounts/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: csvText }),
        }
      );
      const json = await res.json();

      if (json.success) {
        setResult(json.data);
        setStep("done");
        toast.success(
          `Imported ${json.data.created} accounts (${json.data.skipped} skipped)`
        );
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep("choose");
    setCsvText("");
    setPreview([]);
    setSelectedTemplate(null);
    setResult(null);
  }

  function downloadTemplateCsv() {
    const csv = "number,name,type,description,parentNumber\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coa-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Step indicators ───────────────────────────────

  const steps = [
    { key: "choose", label: "Choose Source" },
    { key: "preview", label: "Preview" },
    { key: "done", label: "Complete" },
  ];

  // ─── Render ────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Import Chart of Accounts
        </h1>
        <p className="text-muted-foreground">
          {currentEntity?.name} — Choose a template or upload your own CSV
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <Badge
              variant={
                step === s.key || (step === "upload" && s.key === "choose")
                  ? "default"
                  : steps.findIndex((x) => x.key === step) > i
                    ? "secondary"
                    : "outline"
              }
            >
              {i + 1}. {s.label}
            </Badge>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step: Choose */}
      {(step === "choose" || step === "upload") && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Pre-built Templates</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(COA_TEMPLATES).map(([key, template]) => (
              <Card
                key={key}
                className={cn(
                  "cursor-pointer transition-colors hover:ring-2 hover:ring-primary/50",
                  selectedTemplate === key && "ring-2 ring-primary"
                )}
                onClick={() => selectTemplate(key)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {template.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="relative flex items-center gap-4 py-2">
            <div className="flex-1 border-t" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 border-t" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Columns: number, name, type, description (optional),
                parentNumber (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
              />
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadTemplateCsv}>
                <Download className="mr-1 h-3 w-3" />
                Download blank template CSV
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {selectedTemplate && (
            <p className="text-sm text-muted-foreground">
              Template: <span className="font-medium text-foreground">{COA_TEMPLATES[selectedTemplate]?.name}</span>
            </p>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4" />
                Preview ({csvText.trim().split("\n").length - 1} accounts)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {preview[0]?.map((header, i) => (
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
                            {cell || <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvText.trim().split("\n").length > 8 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Showing first 7 of {csvText.trim().split("\n").length - 1} rows
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("choose")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={runImport} disabled={importing}>
              {importing ? "Importing..." : "Import Accounts"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <div className="text-center">
              <p className="text-lg font-semibold">Import Complete</p>
              <p className="text-muted-foreground">
                {result.created} accounts created, {result.skipped} skipped
                (already existed)
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={reset}>
                Import More
              </Button>
              <Button
                render={
                  <a href="/accounts" />
                }
              >
                View Chart of Accounts
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
