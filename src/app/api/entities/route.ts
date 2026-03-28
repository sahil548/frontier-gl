import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { createEntitySchema } from "@/lib/validators/entity";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { serializeEntity } from "@/lib/utils/serialization";

/**
 * Entity management API routes.
 *
 * These routes are USER-scoped (not entity-scoped).
 * Entity management operates on the user's entities, not within an entity.
 *
 * The /api/entities/:entityId/ scoping pattern (API-01) applies to
 * financial data WITHIN an entity (accounts, journal entries, etc.)
 * which will be implemented in Phase 2.
 */

/**
 * Upsert a User record by Clerk ID.
 *
 * Since Clerk manages authentication and we don't have a webhook sync,
 * the first API call from a new Clerk user creates their internal User record.
 */
async function getOrCreateUser(clerkUserId: string) {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? "";
  const name = clerkUser?.fullName ?? clerkUser?.firstName ?? null;

  return prisma.user.upsert({
    where: { clerkId: clerkUserId },
    update: { email, name },
    create: { clerkId: clerkUserId, email, name },
  });
}

/**
 * GET /api/entities
 *
 * Returns a list of active entities for the authenticated user.
 * Ordered by name ascending.
 */
export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  // Fast path: look up user by clerkId without the expensive currentUser() call.
  // The user record is created on first entity creation (POST), so if it doesn't
  // exist yet, just return an empty list (triggers onboarding).
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    return successResponse([]);
  }

  const entities = await prisma.entity.findMany({
    where: {
      createdById: user.id,
      isActive: true,
    },
    orderBy: { name: "asc" },
  });

  return successResponse(entities.map(serializeEntity));
}

/**
 * POST /api/entities
 *
 * Creates a new entity with Zod-validated input.
 * Returns 201 with the created entity on success.
 * Returns 400 with validation errors on invalid input.
 */
export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = createEntitySchema.safeParse(body);

  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const user = await getOrCreateUser(userId);

  const entity = await prisma.entity.create({
    data: {
      ...result.data,
      createdById: user.id,
    },
  });

  return successResponse(serializeEntity(entity), 201);
}
