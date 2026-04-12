import { prisma } from "@/lib/db/prisma";

/**
 * Retrieves a saved column mapping for a specific entity, source name, and import type.
 *
 * @returns The saved mapping object, or null if not found
 */
export async function getSavedMapping(
  entityId: string,
  sourceName: string,
  importType: string
): Promise<Record<string, string> | null> {
  const record = await prisma.columnMapping.findUnique({
    where: {
      entityId_sourceName_importType: {
        entityId,
        sourceName,
        importType,
      },
    },
  });

  if (!record) return null;
  return record.mapping as Record<string, string>;
}

/**
 * Saves (upserts) a column mapping for an entity+source+type combination.
 * If a mapping already exists for this combination, it is updated.
 */
export async function saveMapping(
  entityId: string,
  sourceName: string,
  importType: string,
  mapping: Record<string, string>
): Promise<void> {
  await prisma.columnMapping.upsert({
    where: {
      entityId_sourceName_importType: {
        entityId,
        sourceName,
        importType,
      },
    },
    create: {
      entityId,
      sourceName,
      importType,
      mapping,
    },
    update: {
      mapping,
    },
  });
}
