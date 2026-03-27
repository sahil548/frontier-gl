import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { suggestNextAccountNumber } from "@/lib/accounts/next-number";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * Find the internal user and verify entity ownership.
 */
async function findOwnedEntity(entityId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (!user) return null;

  return prisma.entity.findFirst({
    where: { id: entityId, createdById: user.id, isActive: true },
  });
}

/**
 * GET /api/entities/:entityId/accounts/next-number?parentNumber=10000
 *
 * Suggests the next available account number for the entity.
 * If parentNumber is provided, suggests a sub-account number.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
  const entity = await findOwnedEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const url = new URL(request.url);
  const parentNumber = url.searchParams.get("parentNumber") ?? undefined;

  try {
    const suggestedNumber = await suggestNextAccountNumber(
      entityId,
      parentNumber
    );
    return successResponse({ suggestedNumber });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to suggest number";
    return errorResponse(message, 500);
  }
}
