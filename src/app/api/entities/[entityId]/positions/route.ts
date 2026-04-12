import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";

/**
 * GET /api/entities/:entityId/positions
 *
 * Returns all active positions across active holdings for the entity.
 * Each position includes holding metadata and linked GL account info.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
  });
  if (!access) return errorResponse("Entity not found", 403);

  const positions = await prisma.position.findMany({
    where: {
      subledgerItem: { entityId, isActive: true },
      isActive: true,
    },
    include: {
      subledgerItem: {
        select: {
          id: true,
          name: true,
          itemType: true,
          accountId: true,
          account: {
            select: { id: true, number: true, name: true, type: true },
          },
        },
      },
    },
    orderBy: [
      { subledgerItem: { name: "asc" } },
      { name: "asc" },
    ],
  });

  const serialized = positions.map((p) => ({
    id: p.id,
    name: p.name,
    holdingName: p.subledgerItem.name,
    holdingType: p.subledgerItem.itemType,
    holdingId: p.subledgerItem.id,
    accountId: p.subledgerItem.accountId,
    accountNumber: p.subledgerItem.account.number,
    accountName: p.subledgerItem.account.name,
    accountType: p.subledgerItem.account.type,
  }));

  return successResponse(serialized);
}
