/**
 * Entity scoping helper for database queries.
 *
 * Used in every API route that queries entity-scoped data.
 * When "all" is selected, no entity filter is applied (returns all entities).
 * When a specific entityId is provided, queries are scoped to that entity.
 *
 * Usage:
 *   prisma.account.findMany({ where: { ...entityScope(entityId) } })
 */
export function entityScope(
  entityId: string | "all"
): { entityId: string } | Record<string, never> {
  if (entityId === "all") {
    return {};
  }
  return { entityId };
}
