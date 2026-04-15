import { z } from "zod";

/**
 * Validates a single parsed CSV row from a bank statement.
 * All fields arrive as strings from PapaParse; amount may also be numeric.
 */
export const csvRowSchema = z.object({
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.union([z.string(), z.number()]),
});

export type CsvRow = z.infer<typeof csvRowSchema>;

/**
 * Legacy single-account CSV import body.
 * All parsed rows are routed to the single `subledgerItemId`.
 */
const legacyCsvImportSchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
  subledgerItemId: z.string().min(1, "Subledger item ID is required"),
  columnMapping: z.record(z.string(), z.string()).optional(),
  // Multi-account fields are forbidden on the legacy branch so a body with
  // BOTH shapes can only ever validate down one branch (mutually exclusive).
  accountResolution: z.undefined().optional(),
});

/**
 * Phase 12-09: Multi-account CSV import body.
 *
 * When the ColumnMappingUI maps the "account" role, the Bank Feed page sends
 * this shape. `parseBankStatementCsv` extracts `accountRef` per row; the API
 * resolves each `accountRef` to a `subledgerItemId` using `matchBy`:
 *  - "name"   — match against `subledgerItem.name`
 *  - "number" — match against linked `account.number`
 *
 * Unresolved rows are returned in the errors array (not imported).
 */
const multiAccountCsvImportSchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
  columnMapping: z
    .record(z.string(), z.string())
    .refine(
      (m) => typeof m["account"] === "string" && m["account"].length > 0,
      {
        message:
          "Multi-account import requires columnMapping.account to be mapped to a CSV column",
      }
    ),
  accountResolution: z.object({
    strategy: z.literal("per-row"),
    matchBy: z.enum(["name", "number"]),
  }),
  // Legacy field is forbidden on this branch to enforce mutual exclusivity.
  subledgerItemId: z.undefined().optional(),
});

/**
 * Validates the CSV import request body.
 * Accepts either the legacy single-account shape or the Phase 12-09
 * multi-account shape (mutually exclusive).
 */
export const csvImportSchema = z.union([
  legacyCsvImportSchema,
  multiAccountCsvImportSchema,
]);

export type CsvImport = z.infer<typeof csvImportSchema>;

/**
 * Discriminates a parsed csvImportSchema body.
 * Returns true when the body is a multi-account import (has accountResolution).
 */
export function isMultiAccountImport(
  parsed: CsvImport
): parsed is z.infer<typeof multiAccountCsvImportSchema> {
  return (
    typeof (parsed as Record<string, unknown>).accountResolution === "object" &&
    (parsed as Record<string, unknown>).accountResolution !== null
  );
}

/**
 * Validates bank transaction create/update fields.
 */
export const bankTransactionSchema = z.object({
  subledgerItemId: z.string().min(1),
  externalId: z.string().nullable().optional(),
  date: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "Date must be a valid date string",
  }),
  description: z.string().min(1, "Description is required"),
  amount: z.union([z.string(), z.number()]),
  originalDescription: z.string().nullable().optional(),
  merchantName: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  source: z.enum(["CSV", "PLAID"]),
  status: z.enum(["PENDING", "CATEGORIZED", "POSTED", "EXCLUDED"]).optional(),
  accountId: z.string().nullable().optional(),
  positionId: z.string().nullable().optional(),
  reconciliationStatus: z.enum(["PENDING", "RECONCILED", "UNMATCHED"]).optional(),
  ruleId: z.string().nullable().optional(),
});

export type BankTransaction = z.infer<typeof bankTransactionSchema>;

/**
 * Validates categorization rule create/update.
 * Rules must target at least one of accountId or positionId.
 */
export const categorizationRuleSchema = z.object({
  pattern: z.string().min(1, "Pattern is required"),
  amountMin: z.number().optional(),
  amountMax: z.number().optional(),
  accountId: z.string().optional(),
  positionId: z.string().optional(),
  dimensionTags: z.record(z.string(), z.string()).optional(),
}).refine((d) => d.accountId || d.positionId, {
  message: "Either accountId or positionId is required",
});

export type CategorizationRule = z.infer<typeof categorizationRuleSchema>;

/**
 * Validates bulk categorize action.
 */
export const bulkCategorizeSchema = z.object({
  transactionIds: z.array(z.string().min(1)).min(1, "At least one transaction is required"),
  accountId: z.string().min(1, "Account ID is required"),
  postImmediately: z.boolean().optional(),
});

export type BulkCategorize = z.infer<typeof bulkCategorizeSchema>;

/**
 * Validates a single split line.
 */
export const splitLineSchema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  amount: z.number().positive("Amount must be positive"),
  memo: z.string().optional(),
});

export type SplitLine = z.infer<typeof splitLineSchema>;

/**
 * Validates split transaction request.
 * Must have at least 2 split lines.
 */
export const splitTransactionSchema = z.object({
  lines: z.array(splitLineSchema).refine((lines) => lines.length >= 2, {
    message: "Split transaction must have at least 2 lines",
  }),
});

export type SplitTransaction = z.infer<typeof splitTransactionSchema>;
