import { z } from "zod";

/**
 * Validation schemas for elimination rule CRUD operations.
 */

export const createEliminationRuleSchema = z
  .object({
    label: z.string().min(1, "Label is required").max(200),
    entityAId: z.string().min(1, "Entity A is required"),
    accountAId: z.string().min(1, "Account A is required"),
    entityBId: z.string().min(1, "Entity B is required"),
    accountBId: z.string().min(1, "Account B is required"),
  })
  .refine((data) => data.entityAId !== data.entityBId, {
    message: "Elimination rule must span two different entities",
    path: ["entityBId"],
  });

export type CreateEliminationRuleInput = z.input<
  typeof createEliminationRuleSchema
>;

export const updateEliminationRuleSchema = z.object({
  label: z.string().min(1).max(200).optional(),
  entityAId: z.string().min(1).optional(),
  accountAId: z.string().min(1).optional(),
  entityBId: z.string().min(1).optional(),
  accountBId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateEliminationRuleInput = z.input<
  typeof updateEliminationRuleSchema
>;
