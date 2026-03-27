import { z } from "zod";

// ─── Entity Type Enum ────────────────────────────────────

export const entityTypeEnum = z.enum([
  "LP",
  "LLC",
  "CORPORATION",
  "S_CORP",
  "TRUST",
  "FOUNDATION",
  "PARTNERSHIP",
  "INDIVIDUAL",
  "OTHER",
]);

// ─── COA Template Enum ───────────────────────────────────

export const coaTemplateEnum = z.enum(["TEMPLATE", "BLANK"]);

// ─── Create Entity Schema ────────────────────────────────

const baseCreateEntitySchema = z.object({
  name: z
    .string()
    .min(1, "Entity name is required")
    .max(200, "Entity name must be 200 characters or fewer"),
  type: entityTypeEnum,
  typeOther: z
    .string()
    .max(100, "Type description must be 100 characters or fewer")
    .optional(),
  fiscalYearEnd: z
    .string()
    .regex(
      /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
      "Fiscal year end must be in MM-DD format"
    ),
  coaTemplate: coaTemplateEnum.default("BLANK"),
});

/**
 * Zod schema for creating an entity.
 * Requires typeOther when type is "OTHER".
 */
export const createEntitySchema = baseCreateEntitySchema.refine(
  (data) => {
    if (data.type === "OTHER") {
      return data.typeOther !== undefined && data.typeOther.trim().length > 0;
    }
    return true;
  },
  {
    message: "Type description is required when type is OTHER",
    path: ["typeOther"],
  }
);

// ─── Update Entity Schema ────────────────────────────────

/**
 * Zod schema for updating an entity.
 * All fields are optional. Includes isActive for soft-delete (deactivation).
 */
export const updateEntitySchema = baseCreateEntitySchema.partial().extend({
  isActive: z.boolean().optional(),
});

// ─── Inferred Types ──────────────────────────────────────

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;
