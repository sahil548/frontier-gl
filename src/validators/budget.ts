import { z } from "zod";

/**
 * Single budget line item for API upsert.
 * Amount is a string to preserve decimal precision through JSON transport.
 */
export const budgetLineSchema = z.object({
  accountId: z.string().cuid(),
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  amount: z.string(),
});

export type BudgetLine = z.infer<typeof budgetLineSchema>;

/**
 * Bulk budget upsert payload.
 * fiscalYear identifies the target year; budgets array contains individual lines.
 */
export const budgetUpsertSchema = z.object({
  fiscalYear: z.number().int(),
  budgets: z.array(budgetLineSchema),
});

export type BudgetUpsert = z.infer<typeof budgetUpsertSchema>;

/**
 * CSV row schema for budget import.
 * period format: MM/YYYY (e.g., "01/2025", "3/2025")
 * amount: numeric string validated with parseFloat
 */
export const budgetCsvRowSchema = z.object({
  accountNumber: z.string().min(1),
  period: z.string().regex(/^\d{1,2}\/\d{4}$/),
  amount: z.string().refine((s) => !isNaN(parseFloat(s)), {
    message: "Amount must be a valid number",
  }),
});

export type BudgetCsvRow = z.infer<typeof budgetCsvRowSchema>;
