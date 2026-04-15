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

/**
 * Finds a saved mapping whose stored header names are a subset of the provided
 * CSV headers (normalized: trimmed + lowercased). Used as a fingerprint fallback
 * when the client does not send a sourceName — so that a previously-saved
 * mapping still auto-applies on subsequent imports with the same CSV shape.
 *
 * Returns the most recently updated matching record (so the latest confirmed
 * mapping wins) along with its original sourceName for UI surfacing.
 *
 * Matching is superset (not strict equality): every header referenced by the
 * stored mapping must appear in the incoming CSV, but the incoming CSV is
 * allowed to have additional columns not referenced by the saved mapping.
 * This tolerates users adding new columns to an exported CSV while reusing
 * a saved role-to-header assignment.
 */
export async function findMappingByHeaders(
  entityId: string,
  importType: string,
  headers: string[]
): Promise<{ sourceName: string; mapping: Record<string, string> } | null> {
  const records = await prisma.columnMapping.findMany({
    where: { entityId, importType },
    orderBy: { updatedAt: "desc" },
  });

  if (!records || records.length === 0) return null;

  const wanted = new Set(headers.map((h) => h.trim().toLowerCase()));

  for (const record of records) {
    const storedMapping = record.mapping as Record<string, string>;
    const storedHeaders = Object.values(storedMapping).map((h) =>
      h.trim().toLowerCase()
    );

    if (storedHeaders.length === 0) continue;

    const allPresent = storedHeaders.every((h) => wanted.has(h));
    if (allPresent) {
      return {
        sourceName: record.sourceName,
        mapping: storedMapping,
      };
    }
  }

  return null;
}
