import Papa from "papaparse";
import { csvRowSchema } from "@/validators/bank-transaction";

/**
 * Parsed bank statement row.
 */
export interface ParsedBankRow {
  date: string;
  description: string;
  amount: number;
  reference?: string;
}

/**
 * Column name pattern groups for auto-detection.
 * Each key maps to an array of case-insensitive patterns that indicate a column role.
 */
const COLUMN_PATTERNS: Record<string, string[]> = {
  date: ["date", "posted date", "trans date", "transaction date", "posting date"],
  description: [
    "description",
    "memo",
    "details",
    "transaction description",
    "narrative",
    "payee",
  ],
  amount: ["amount", "transaction amount", "net amount"],
  debit: ["debit", "debit amount", "withdrawal", "withdrawals"],
  credit: ["credit", "credit amount", "deposit", "deposits"],
  reference: ["reference", "ref", "check number", "check #", "confirmation"],
};

/**
 * Detects which header maps to which role.
 * Returns a mapping from role -> actual header name.
 * Exported for use as heuristic fallback in the LLM column detection flow.
 */
export function detectColumns(
  headers: string[]
): { date: string; description: string; amount?: string; debit?: string; credit?: string; reference?: string } {
  const normalized = headers.map((h) => h.trim().toLowerCase());

  const findColumn = (role: string): string | undefined => {
    const patterns = COLUMN_PATTERNS[role];
    if (!patterns) return undefined;

    for (const pattern of patterns) {
      const idx = normalized.indexOf(pattern);
      if (idx !== -1) return headers[idx];
    }
    return undefined;
  };

  const date = findColumn("date");
  const description = findColumn("description");
  const amount = findColumn("amount");
  const debit = findColumn("debit");
  const credit = findColumn("credit");
  const reference = findColumn("reference");

  if (!date) {
    throw new Error(
      "Cannot detect date column. Expected one of: " + COLUMN_PATTERNS.date.join(", ")
    );
  }

  if (!description) {
    throw new Error(
      "Cannot detect description column. Expected one of: " +
        COLUMN_PATTERNS.description.join(", ")
    );
  }

  if (!amount && !debit && !credit) {
    throw new Error(
      "Cannot detect amount column(s). Expected 'Amount' or separate 'Debit'/'Credit' columns"
    );
  }

  // Must have both debit and credit if no single amount column
  if (!amount && (!debit || !credit)) {
    throw new Error(
      "Found only one of Debit/Credit columns; both are required when Amount column is missing"
    );
  }

  return { date, description, amount, debit, credit, reference };
}

/**
 * Parse a numeric string, stripping currency symbols and commas.
 */
function parseAmount(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  // Strip currency symbols, commas, spaces
  const cleaned = value.replace(/[$,\s]/g, "");
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return num;
}

/**
 * Parses a bank statement CSV string into structured transaction rows.
 *
 * Supports:
 * - Standard columns: Date, Description, Amount
 * - Split columns: Date, Description, Debit, Credit
 * - Alternate column names (see COLUMN_PATTERNS)
 * - Quoted fields with commas
 *
 * For debit/credit split: debit values become negative, credit values become positive.
 *
 * @param columnMapping - Optional pre-confirmed column mapping from ColumnMappingUI. If provided, skips auto-detection.
 * @throws Error if CSV is empty or required columns cannot be detected
 */
export function parseBankStatementCsv(csvText: string, columnMapping?: Record<string, string>): ParsedBankRow[] {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV content is empty");
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (!parsed.meta.fields || parsed.meta.fields.length === 0) {
    throw new Error("CSV has no headers");
  }

  if (parsed.data.length === 0) {
    throw new Error("CSV has no data rows");
  }

  // Use provided column mapping or auto-detect
  const columns = columnMapping
    ? (columnMapping as { date: string; description: string; amount?: string; debit?: string; credit?: string; reference?: string })
    : detectColumns(parsed.meta.fields);
  const rows: ParsedBankRow[] = [];

  for (const row of parsed.data) {
    const dateVal = row[columns.date]?.trim();
    const descVal = row[columns.description]?.trim();

    // Validate row against Zod schema — skip invalid rows
    const validation = csvRowSchema.safeParse({
      date: dateVal,
      description: descVal,
      amount: columns.amount ? row[columns.amount] : "0",
    });
    if (!validation.success) continue;

    let amount: number;

    if (columns.amount) {
      // Single amount column
      amount = parseAmount(row[columns.amount]);
    } else {
      // Split debit/credit columns
      const debitVal = parseAmount(row[columns.debit!]);
      const creditVal = parseAmount(row[columns.credit!]);
      // Debit = money out (negative), Credit = money in (positive)
      amount = debitVal > 0 ? -debitVal : creditVal;
    }

    const result: ParsedBankRow = {
      date: dateVal,
      description: descVal,
      amount,
    };

    if (columns.reference && row[columns.reference]) {
      result.reference = row[columns.reference].trim();
    }

    rows.push(result);
  }

  return rows;
}
