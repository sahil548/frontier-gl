import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import { z } from "zod";

// ── Types ───────────────────────────────────────────────

interface WizardProgress {
  coaComplete: boolean;
  holdingsComplete: boolean;
  balancesComplete: boolean;
  transactionsComplete: boolean;
  dismissedAt?: string;
}

const DEFAULT_PROGRESS: WizardProgress = {
  coaComplete: false,
  holdingsComplete: false,
  balancesComplete: false,
  transactionsComplete: false,
};

const patchSchema = z.object({
  coaComplete: z.boolean().optional(),
  holdingsComplete: z.boolean().optional(),
  balancesComplete: z.boolean().optional(),
  transactionsComplete: z.boolean().optional(),
  dismissedAt: z.string().optional(),
});

// ── GET ─────────────────────────────────────────────────

/**
 * GET /api/entities/:entityId/wizard-progress
 *
 * Returns the wizard progress for this entity.
 * Falls back to default (all false) if no progress stored.
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
    include: { entity: true },
  });
  if (!access) return errorResponse("Entity not found", 404);

  const progress = (access.entity.wizardProgress as WizardProgress | null) ?? DEFAULT_PROGRESS;

  return successResponse(progress);
}

// ── PATCH ───────────────────────────────────────────────

/**
 * PATCH /api/entities/:entityId/wizard-progress
 *
 * Merges partial progress update with existing wizard progress.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  const user = await getInternalUser(userId);
  if (!user) return errorResponse("Unauthorized", 401);

  const access = await prisma.entityAccess.findUnique({
    where: { entityId_userId: { entityId, userId: user.id } },
    include: { entity: true },
  });
  if (!access) return errorResponse("Entity not found", 404);

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid input", 400);
  }

  const existing = (access.entity.wizardProgress as WizardProgress | null) ?? DEFAULT_PROGRESS;
  const merged: WizardProgress = { ...existing, ...parsed.data };

  await prisma.entity.update({
    where: { id: entityId },
    data: { wizardProgress: merged as Record<string, unknown> },
  });

  return successResponse(merged);
}
