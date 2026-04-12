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
 * Validates the CSV import request body.
 */
export const csvImportSchema = z.object({
  csv: z.string().min(1, "CSV content is required"),
  subledgerItemId: z.string().min(1, "Subledger item ID is required"),
});

export type CsvImport = z.infer<typeof csvImportSchema>;

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
