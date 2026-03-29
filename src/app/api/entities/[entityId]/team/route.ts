import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";

/**
 * Team management API routes for entity access.
 *
 * GET    /api/entities/:entityId/team         — List all users with access
 * POST   /api/entities/:entityId/team         — Grant access by email
 * DELETE /api/entities/:entityId/team         — Revoke access (body: { userId })
 */

// ─── GET: List team members ──────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  // Verify requesting user has access to entity
  const requestingUser = await getInternalUser(userId);
  if (!requestingUser) {
    return errorResponse("Unauthorized", 401);
  }

  const requestingAccess = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: requestingUser.id } },
  });
  if (!requestingAccess) {
    return errorResponse("Entity not found", 404);
  }

  const accessRecords = await prisma.entityAccess.findMany({
    where: { entityId },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const members = accessRecords.map((a) => ({
    id: a.user.id,
    email: a.user.email,
    name: a.user.name,
    role: a.role,
  }));

  return successResponse(members);
}

// ─── POST: Grant access ──────────────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  // Verify requesting user is OWNER
  const requestingUser = await getInternalUser(userId);
  if (!requestingUser) {
    return errorResponse("Unauthorized", 401);
  }

  const requestingAccess = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: requestingUser.id } },
  });
  if (!requestingAccess || requestingAccess.role !== "OWNER") {
    return errorResponse("Only owners can manage team members", 403);
  }

  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { email, role } = body;
  if (!email || typeof email !== "string") {
    return errorResponse("email is required", 400);
  }

  const validRoles = ["OWNER", "EDITOR", "VIEWER"];
  const accessRole = role && validRoles.includes(role) ? role : "EDITOR";

  // Find user by email — must have signed in at least once
  const targetUser = await prisma.user.findUnique({ where: { email } });
  if (!targetUser) {
    return errorResponse(
      "User must sign in to the app first before being added",
      404
    );
  }

  // Check if access already exists
  const existing = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: targetUser.id } },
  });
  if (existing) {
    return errorResponse("User already has access to this entity", 409);
  }

  const access = await prisma.entityAccess.create({
    data: {
      entityId,
      userId: targetUser.id,
      role: accessRole as "OWNER" | "EDITOR" | "VIEWER",
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return successResponse(
    {
      id: access.user.id,
      email: access.user.email,
      name: access.user.name,
      role: access.role,
    },
    201
  );
}

// ─── DELETE: Revoke access ───────────────────────────────

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  // Verify requesting user is OWNER
  const requestingUser = await getInternalUser(userId);
  if (!requestingUser) {
    return errorResponse("Unauthorized", 401);
  }

  const requestingAccess = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: requestingUser.id } },
  });
  if (!requestingAccess || requestingAccess.role !== "OWNER") {
    return errorResponse("Only owners can manage team members", 403);
  }

  let body: { userId?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const { userId: targetUserId } = body;
  if (!targetUserId || typeof targetUserId !== "string") {
    return errorResponse("userId is required", 400);
  }

  // Check the target access record exists
  const targetAccess = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: targetUserId } },
  });
  if (!targetAccess) {
    return errorResponse("User does not have access to this entity", 404);
  }

  // Cannot remove the last OWNER
  if (targetAccess.role === "OWNER") {
    const ownerCount = await prisma.entityAccess.count({
      where: { entityId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      return errorResponse("Cannot remove the last owner of an entity", 400);
    }
  }

  await prisma.entityAccess.delete({
    where: { entityId_userId: { entityId, userId: targetUserId } },
  });

  return successResponse({ success: true });
}
