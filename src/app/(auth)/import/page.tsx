"use client";

import { useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Download,
  FileDown,
  FileUp,
  Table,
  LayoutList,
} from "lucide-react";
import { toast } from "sonner";
import { useEntityContext } from "@/providers/entity-provider";
import { exportToCsv } from "@/lib/export/csv-export";
import { formatCurrency } from "@/lib/utils/accounting";
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
    description: "Just the 5 top-level categories -- build your own from scratch",
    csv: `number,name,type
10000,Assets,ASSET
20000,Liabilities,LIABILITY
30000,Equity,EQUITY
40000,Income,INCOME
50000,Expenses,EXPENSE`,
  },
};

// ─── Types ──────────────────────────────────────────────

type ViewState = "idle" | "coa-wizard" | "je-wizard";
type CoaStep = "choose" | "upload" | "preview" | "done";
type JeStep = "upload" | "preview" | "done";

// ─── Main Page ──────────────────────────────────────────

export default function DataManagementPage() {
  const { currentEntityId, entities, isLoading } = useEntityContext();

  // View state machine
  const [view, setView] = useState<ViewState>("idle");

  // COA wizard state
  const [coaStep, setCoaStep] = useState<CoaStep>("choose");
  const [coaCsvText, setCoaCsvText] = useState("");
  const [coaPreview, setCoaPreview] = useState<string[][]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [coaImporting, setCoaImporting] = useState(false);
  const [coaResult, setCoaResult] = useState<{ created: number; skipped: number } | null>(null);

  // JE wizard state
  const [jeStep, setJeStep] = useState<JeStep>("upload");
  const [jeCsvText, setJeCsvText] = useState("");
  const [jePreview, setJePreview] = useState<string[][]>([]);
  const [jeImporting, setJeImporting] = useState(false);
  const [jeResult, setJeResult] = useState<{ created: number } | null>(null);

  // Export loading states
  const [exportingCoa, setExportingCoa] = useState(false);
  const [exportingJe, setExportingJe] = useState(false);
  const [exportingTb, setExportingTb] = useState(false);

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
        <h1 className="text-2xl font-semibold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">Create an entity first.</p>
      </div>
    );
  }

  if (currentEntityId === "all") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">
          Select a specific entity to import or export data.
        </p>
      </div>
    );
  }

  const currentEntity = entities.find((e) => e.id === currentEntityId);

  // ─── COA Wizard Handlers ─────────────────────────────

  function selectTemplate(key: string) {
    const template = COA_TEMPLATES[key];
    if (!template) return;
    setSelectedTemplate(key);
    setCoaCsvText(template.csv);
    parseCoaPreview(template.csv);
    setCoaStep("preview");
  }

  function handleCoaFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCoaCsvText(text);
      parseCoaPreview(text);
      setSelectedTemplate(null);
      setCoaStep("preview");
    };
    reader.readAsText(file);
  }

  function parseCoaPreview(text: string) {
    const lines = text.trim().split("\n").slice(0, 8);
    setCoaPreview(
      lines.map((line) =>
        line.split(",").map((c) => c.trim().replace(/"/g, ""))
      )
    );
  }

  async function runCoaImport() {
    if (!coaCsvText) return;
    setCoaImporting(true);

    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/accounts/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: coaCsvText }),
        }
      );
      const json = await res.json();

      if (json.success) {
        setCoaResult(json.data);
        setCoaStep("done");
        toast.success(
          `Imported ${json.data.created} accounts (${json.data.skipped} skipped)`
        );
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setCoaImporting(false);
    }
  }

  function resetCoaWizard() {
    setCoaStep("choose");
    setCoaCsvText("");
    setCoaPreview([]);
    setSelectedTemplate(null);
    setCoaResult(null);
  }

  // ─── JE Wizard Handlers ──────────────────────────────

  function handleJeFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setJeCsvText(text);
      parseJePreview(text);
      setJeStep("preview");
    };
    reader.readAsText(file);
  }

  function parseJePreview(text: string) {
    const lines = text.trim().split("\n").slice(0, 8);
    setJePreview(
      lines.map((line) =>
        line.split(",").map((c) => c.trim().replace(/"/g, ""))
      )
    );
  }

  async function runJeImport() {
    if (!jeCsvText) return;
    setJeImporting(true);

    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/journal-entries/import`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ csv: jeCsvText }),
        }
      );
      const json = await res.json();

      if (json.success) {
        setJeResult(json.data);
        setJeStep("done");
        toast.success(`Imported ${json.data.created} journal entries as drafts`);
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch {
      toast.error("Import failed");
    } finally {
      setJeImporting(false);
    }
  }

  function resetJeWizard() {
    setJeStep("upload");
    setJeCsvText("");
    setJePreview([]);
    setJeResult(null);
  }

  // ─── Export Handlers ─────────────────────────────────

  async function exportChartOfAccounts() {
    setExportingCoa(true);
    try {
      const res = await fetch(`/api/entities/${currentEntityId}/accounts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch accounts");

      const accounts = Array.isArray(json) ? json : json.data ?? [];
      const rows = accounts.map((a: Record<string, unknown>) => ({
        number: a.number ?? "",
        name: a.name ?? "",
        type: a.type ?? "",
        description: a.description ?? "",
        balance: a.balance != null ? formatCurrency(a.balance as number) : "0.00",
      }));
      exportToCsv(rows, `${currentEntity?.name ?? "entity"}-chart-of-accounts.csv`);
      toast.success("Chart of Accounts exported");
    } catch {
      toast.error("Failed to export Chart of Accounts");
    } finally {
      setExportingCoa(false);
    }
  }

  async function exportJournalEntries() {
    setExportingJe(true);
    try {
      const res = await fetch(
        `/api/entities/${currentEntityId}/journal-entries?status=POSTED&limit=1000`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch journal entries");

      const entries = Array.isArray(json) ? json : json.data ?? [];
      const rows: Record<string, unknown>[] = [];
      for (const je of entries) {
        const lines = je.lines ?? je.lineItems ?? [];
        for (const line of lines) {
          rows.push({
            entryNumber: je.entryNumber ?? je.number ?? "",
            date: je.date ?? "",
            description: je.description ?? "",
            status: je.status ?? "",
            account: line.accountNumber ?? line.account?.number ?? "",
            debit: line.debit ?? line.debitAmount ?? "",
            credit: line.credit ?? line.creditAmount ?? "",
            memo: line.memo ?? line.description ?? "",
          });
        }
      }
      exportToCsv(rows, `${currentEntity?.name ?? "entity"}-journal-entries.csv`);
      toast.success("Journal Entries exported");
    } catch {
      toast.error("Failed to export Journal Entries");
    } finally {
      setExportingJe(false);
    }
  }

  async function exportTrialBalance() {
    setExportingTb(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(
        `/api/entities/${currentEntityId}/trial-balance?asOfDate=${today}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch trial balance");

      const tbRows = Array.isArray(json) ? json : json.data ?? [];
      const rows = tbRows.map((r: Record<string, unknown>) => ({
        accountNumber: r.accountNumber ?? r.number ?? "",
        accountName: r.accountName ?? r.name ?? "",
        debit: r.debit != null ? formatCurrency(r.debit as number) : "",
        credit: r.credit != null ? formatCurrency(r.credit as number) : "",
      }));
      exportToCsv(rows, `${currentEntity?.name ?? "entity"}-trial-balance-${today}.csv`);
      toast.success("Trial Balance exported");
    } catch {
      toast.error("Failed to export Trial Balance");
    } finally {
      setExportingTb(false);
    }
  }

  function downloadCoaTemplate() {
    const csv = "number,name,type,description,parentNumber\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "coa-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadJeTemplate() {
    const csv = "date,description,account,debit,credit,memo\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journal-entry-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ─── Back to main grid ──────────────────────────────

  function backToGrid() {
    setView("idle");
    resetCoaWizard();
    resetJeWizard();
  }

  // ─── COA Wizard Step Indicators ─────────────────────

  const coaSteps = [
    { key: "choose", label: "Choose Source" },
    { key: "preview", label: "Preview" },
    { key: "done", label: "Complete" },
  ];

  const jeSteps = [
    { key: "upload", label: "Upload CSV" },
    { key: "preview", label: "Preview" },
    { key: "done", label: "Complete" },
  ];

  // ─── Render: COA Wizard ─────────────────────────────

  if (view === "coa-wizard") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={backToGrid}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Data Management
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import Chart of Accounts
          </h1>
          <p className="text-muted-foreground">
            {currentEntity?.name} — Choose a template or upload your own CSV
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {coaSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <Badge
                variant={
                  coaStep === s.key || (coaStep === "upload" && s.key === "choose")
                    ? "default"
                    : coaSteps.findIndex((x) => x.key === coaStep) > i
                      ? "secondary"
                      : "outline"
                }
              >
                {i + 1}. {s.label}
              </Badge>
              {i < coaSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step: Choose */}
        {(coaStep === "choose" || coaStep === "upload") && (
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
                  onChange={handleCoaFileUpload}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
                />
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadCoaTemplate}>
                  <Download className="mr-1 h-3 w-3" />
                  Download blank template CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step: Preview */}
        {coaStep === "preview" && (
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
                  Preview ({coaCsvText.trim().split("\n").length - 1} accounts)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {coaPreview[0]?.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coaPreview.slice(1).map((row, i) => (
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
                  {coaCsvText.trim().split("\n").length > 8 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Showing first 7 of {coaCsvText.trim().split("\n").length - 1} rows
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCoaStep("choose")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={runCoaImport} disabled={coaImporting}>
                {coaImporting ? "Importing..." : "Import Accounts"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {coaStep === "done" && coaResult && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="text-muted-foreground">
                  {coaResult.created} accounts created, {coaResult.skipped} skipped
                  (already existed)
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { resetCoaWizard(); }}>
                  Import More
                </Button>
                <Button variant="outline" onClick={backToGrid}>
                  Back to Data Management
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

  // ─── Render: JE Wizard ──────────────────────────────

  if (view === "je-wizard") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={backToGrid}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Data Management
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Import Journal Entries
          </h1>
          <p className="text-muted-foreground">
            {currentEntity?.name} — Upload a CSV to import journal entries as drafts
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          {jeSteps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <Badge
                variant={
                  jeStep === s.key
                    ? "default"
                    : jeSteps.findIndex((x) => x.key === jeStep) > i
                      ? "secondary"
                      : "outline"
                }
              >
                {i + 1}. {s.label}
              </Badge>
              {i < jeSteps.length - 1 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {jeStep === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Upload className="h-4 w-4" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Expected columns: date, description, account (number), debit, credit, memo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleJeFileUpload}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/80"
              />
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={downloadJeTemplate}>
                <Download className="mr-1 h-3 w-3" />
                Download blank template CSV
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Preview */}
        {jeStep === "preview" && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <FileSpreadsheet className="h-4 w-4" />
                  Preview ({jeCsvText.trim().split("\n").length - 1} line items)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {jePreview[0]?.map((header, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {jePreview.slice(1).map((row, i) => (
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
                  {jeCsvText.trim().split("\n").length > 8 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Showing first 7 of {jeCsvText.trim().split("\n").length - 1} rows
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { resetJeWizard(); setJeStep("upload"); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={runJeImport} disabled={jeImporting}>
                {jeImporting ? "Importing..." : "Import as Drafts"}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Done */}
        {jeStep === "done" && jeResult && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <div className="text-center">
                <p className="text-lg font-semibold">Import Complete</p>
                <p className="text-muted-foreground">
                  {jeResult.created} journal entries imported as drafts
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { resetJeWizard(); }}>
                  Import More
                </Button>
                <Button variant="outline" onClick={backToGrid}>
                  Back to Data Management
                </Button>
                <Button
                  render={
                    <a href="/journal" />
                  }
                >
                  View Journal Entries
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ─── Render: Main Grid (idle) ───────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Management</h1>
        <p className="text-muted-foreground">
          {currentEntity?.name} — Import and export your financial data
        </p>
      </div>

      {/* ── Import Section ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Import Data</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-colors hover:ring-2 hover:ring-primary/50"
            onClick={() => { resetCoaWizard(); setView("coa-wizard"); }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <LayoutList className="h-4 w-4 text-blue-500" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>
                Import from a pre-built template (Family Office, Real Estate, Investment Fund, Minimal) or upload your own CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Templates available</Badge>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-colors hover:ring-2 hover:ring-primary/50"
            onClick={() => { resetJeWizard(); setView("je-wizard"); }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                Journal Entries
              </CardTitle>
              <CardDescription>
                Upload a CSV with columns: date, description, account (number), debit, credit, memo. Entries are imported as drafts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">CSV upload</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Export Section ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Export Data</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <LayoutList className="h-4 w-4 text-blue-500" />
                Chart of Accounts
              </CardTitle>
              <CardDescription>
                Export all accounts with number, name, type, description, and balance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={exportChartOfAccounts}
                disabled={exportingCoa}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportingCoa ? "Exporting..." : "Export CSV"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileSpreadsheet className="h-4 w-4 text-green-500" />
                Journal Entries
              </CardTitle>
              <CardDescription>
                Export all posted journal entries with line-item detail as CSV.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={exportJournalEntries}
                disabled={exportingJe}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportingJe ? "Exporting..." : "Export CSV"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Table className="h-4 w-4 text-purple-500" />
                Trial Balance
              </CardTitle>
              <CardDescription>
                Export the trial balance as of today with account numbers, names, debits, and credits.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="sm"
                onClick={exportTrialBalance}
                disabled={exportingTb}
              >
                <Download className="mr-2 h-4 w-4" />
                {exportingTb ? "Exporting..." : "Export CSV"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Download className="h-4 w-4 text-orange-500" />
                Download Templates
              </CardTitle>
              <CardDescription>
                Download blank CSV templates for importing Chart of Accounts or Journal Entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadCoaTemplate}>
                COA Template
              </Button>
              <Button size="sm" variant="outline" onClick={downloadJeTemplate}>
                JE Template
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
