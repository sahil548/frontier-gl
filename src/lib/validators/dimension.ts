import { z } from "zod";

// ─── Dimension Schemas ───────────────────────────────────

export const createDimensionSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
});

export const updateDimensionSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Tag Schemas ─────────────────────────────────────────

export const createTagSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or fewer")
    .regex(/^[a-zA-Z0-9]+$/, "Code must be alphanumeric"),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  description: z.string().optional(),
});

export const updateTagSchema = z.object({
  code: z
    .string()
    .min(1, "Code is required")
    .max(10, "Code must be 10 characters or fewer")
    .regex(/^[a-zA-Z0-9]+$/, "Code must be alphanumeric")
    .optional(),
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

// ─── Inferred Types ──────────────────────────────────────

export type CreateDimensionInput = z.infer<typeof createDimensionSchema>;
export type UpdateDimensionInput = z.infer<typeof updateDimensionSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
