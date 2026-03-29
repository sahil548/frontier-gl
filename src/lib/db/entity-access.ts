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
