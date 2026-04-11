import { createHash } from "crypto";

/**
 * Generates a SHA-256 hash for a bank transaction to detect duplicates.
 *
 * Normalization:
 * - Description: trimmed and lowercased
 * - Amount: formatted to 4 decimal places
 * - Date: used as-is (string format)
 * - rowIndex: included only when provided (for same-day same-amount same-description disambiguation)
 *
 * @param date - Transaction date string
 * @param amount - Transaction amount as string
 * @param description - Transaction description
 * @param rowIndex - Optional row index for disambiguation
 * @returns 64-character hex SHA-256 hash
 */
export function generateTransactionHash(
  date: string,
  amount: string,
  description: string,
  rowIndex?: number
): string {
  const normalizedDesc = description.trim().toLowerCase();
  const normalizedAmount = parseFloat(amount).toFixed(4);

  let data = `${date}|${normalizedAmount}|${normalizedDesc}`;
  if (rowIndex !== undefined) {
    data += `|${rowIndex}`;
  }

  return createHash("sha256").update(data).digest("hex");
}

/**
 * Finds duplicate transactions by checking existing externalId values.
 *
 * @param subledgerItemId - The subledger item to check against
 * @param hashes - Array of transaction hashes to check
 * @returns Set of hashes that already exist in the database
 */
export async function findDuplicates(
  subledgerItemId: string,
  hashes: string[]
): Promise<Set<string>> {
  // Dynamic import to avoid circular dependency and allow unit testing without Prisma
  const { prisma } = await import("@/lib/db/prisma");

  const existing = await prisma.bankTransaction.findMany({
    where: {
      subledgerItemId,
      externalId: { in: hashes },
    },
    select: { externalId: true },
  });

  return new Set(
    existing
      .map((t) => t.externalId)
      .filter((id): id is string => id !== null)
  );
}
