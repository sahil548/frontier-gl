import { z } from "zod";
import Decimal from "decimal.js";

// ─── Line Item Schema ─────────────────────────────────────

export const lineItemSchema = z
  .object({
    accountId: z.string().min(1, "Account is required"),
    debit: z
      .string()
      .default("0")
      .refine(
        (v) => {
          try {
            return !new Decimal(v || "0").isNegative();
          } catch {
            return false;
          }
        },
        "Debit must be a non-negative number"
      ),
    credit: z
      .string()
      .default("0")
      .refine(
        (v) => {
          try {
            return !new Decimal(v || "0").isNegative();
          } catch {
            return false;
          }
        },
        "Credit must be a non-negative number"
      ),
    memo: z.string().optional(),
  })
  .refine(
    (line) => {
      const d = new Decimal(line.debit || "0");
      const c = new Decimal(line.credit || "0");
      return !(d.isZero() && c.isZero());
    },
    { message: "Each line must have a debit or credit amount" }
  );

// ─── Journal Entry Schema ─────────────────────────────────

export const journalEntrySchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    description: z
      .string()
      .min(1, "Description is required")
      .max(500, "Description must be 500 characters or fewer"),
    lineItems: z
      .array(lineItemSchema)
      .min(2, "At least 2 line items required"),
  })
  .refine(
    (data) => {
      const totalDebit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.debit || "0")),
        new Decimal("0")
      );
      const totalCredit = data.lineItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.credit || "0")),
        new Decimal("0")
      );
      return totalDebit.equals(totalCredit);
    },
    { message: "Total debits must equal total credits", path: ["lineItems"] }
  );

// ─── Inferred Types ───────────────────────────────────────

export type JournalEntryFormValues = z.infer<typeof journalEntrySchema>;
export type LineItemFormValues = z.infer<typeof lineItemSchema>;
