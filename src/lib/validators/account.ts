import { z } from "zod";
import { AccountType } from "@/generated/prisma/enums";

// ─── Create Account Schema ────────────────────────────────

export const createAccountSchema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(200, "Account name must be 200 characters or fewer"),
  number: z
    .string()
    .regex(/^\d{1,5}$/, "Account number must be 1-5 digits"),
  type: z.nativeEnum(AccountType, {
    message: "Invalid account type",
  }),
  description: z
    .string()
    .max(500, "Description must be 500 characters or fewer")
    .optional(),
  parentId: z.string().cuid().optional(),
});

// ─── Update Account Schema ────────────────────────────────

export const updateAccountSchema = createAccountSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Inferred Types ───────────────────────────────────────

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
