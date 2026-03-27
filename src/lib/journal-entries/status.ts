import type { JournalEntryStatus } from "@/generated/prisma/enums";

/**
 * Valid status transitions for journal entries.
 *
 * DRAFT -> APPROVED (review path)
 * DRAFT -> POSTED (quick path)
 * APPROVED -> POSTED (post after review)
 * POSTED -> * (invalid -- posted entries are immutable)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["APPROVED", "POSTED"],
  APPROVED: ["POSTED"],
  POSTED: [], // No transitions allowed from POSTED
};

/**
 * Validates whether a status transition is allowed.
 *
 * @param from - Current status
 * @param to - Target status
 * @returns true if the transition is valid
 */
export function validateStatusTransition(
  from: JournalEntryStatus,
  to: JournalEntryStatus
): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}
