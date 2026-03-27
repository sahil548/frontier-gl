import type { SerializedEntity } from "@/types";
import type Decimal from "decimal.js";

/**
 * Serialize an entity from Prisma to a JSON-safe format.
 *
 * Converts Date objects (createdAt, updatedAt) to ISO 8601 strings.
 * All other fields pass through unchanged.
 */
export function serializeEntity(entity: {
  id: string;
  name: string;
  type: string;
  typeOther: string | null;
  fiscalYearEnd: string;
  coaTemplate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SerializedEntity {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    typeOther: entity.typeOther,
    fiscalYearEnd: entity.fiscalYearEnd,
    coaTemplate: entity.coaTemplate,
    isActive: entity.isActive,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/**
 * Serialize a Prisma Decimal to a string for JSON transport.
 *
 * Used for money fields (Phase 2+) where Prisma returns Decimal objects
 * that are not JSON-serializable.
 *
 * @param value - Decimal value or null
 * @returns String representation or null
 */
export function serializeDecimal(value: Decimal | null): string | null {
  if (value === null) return null;
  return value.toString();
}
