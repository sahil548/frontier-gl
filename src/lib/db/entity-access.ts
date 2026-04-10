import { prisma } from "@/lib/db/prisma";

/** Returns the internal User record for a Clerk user, or null */
export async function getInternalUser(clerkUserId: string) {
  return prisma.user.findUnique({ where: { clerkId: clerkUserId } });
}

/** Returns entity IDs the user has any access to (created or granted) */
export async function getAccessibleEntityIds(clerkUserId: string): Promise<string[]> {
  const user = await getInternalUser(clerkUserId);
  if (!user) return [];
  const access = await prisma.entityAccess.findMany({
    where: { userId: user.id },
    select: { entityId: true },
  });
  return access.map((a) => a.entityId);
}

/** Returns entity if user has access, null otherwise */
export async function findAccessibleEntity(entityId: string, clerkUserId: string) {
  const user = await getInternalUser(clerkUserId);
  if (!user) return null;
  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
    include: { entity: true },
  });
  return access?.entity ?? null;
}

/**
 * Check if user has OWNER role on both entities (required for elimination rule management).
 * Returns the internal user if authorized, null otherwise.
 */
export async function canManageEliminationRule(
  clerkUserId: string,
  entityAId: string,
  entityBId: string
) {
  const user = await getInternalUser(clerkUserId);
  if (!user) return null;

  const accessRecords = await prisma.entityAccess.findMany({
    where: {
      userId: user.id,
      entityId: { in: [entityAId, entityBId] },
      role: "OWNER",
    },
    select: { entityId: true },
  });

  const ownerEntityIds = new Set(accessRecords.map((a) => a.entityId));
  if (!ownerEntityIds.has(entityAId) || !ownerEntityIds.has(entityBId)) {
    return null;
  }

  return user;
}
