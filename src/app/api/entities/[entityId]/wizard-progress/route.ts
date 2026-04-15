import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { getInternalUser } from "@/lib/db/entity-access";
import {
  WIZARD_DEFAULT as DEFAULT_PROGRESS,
  backfillCompleteProgress,
  hasSubstantiveData,
  type WizardProgress,
} from "@/lib/onboarding/wizard-progress";
import { z } from "zod";

// ── Types ───────────────────────────────────────────────

const patchSchema = z.object({
  coaComplete: z.boolean().optional(),
  holdingsComplete: z.boolean().optional(),
  balancesComplete: z.boolean().optional(),
  transactionsComplete: z.boolean().optional(),
  dismissedAt: z.string().optional(),
});

/**
 * Deep-equals against DEFAULT_PROGRESS (all four flags false, no dismissedAt).
 * Pre-existing entities that were seeded before the wizard feature often have
 * `wizardProgress = {}` or the default shape — both should trigger the
 * backfill path.
 */
function isDefaultProgress(p: WizardProgress | null): boolean {
  if (!p) return true;
  return (
    p.coaComplete === false &&
    p.holdingsComplete === false &&
    p.balancesComplete === false &&
    p.transactionsComplete === false &&
    !p.dismissedAt
  );
}

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

  const stored = access.entity.wizardProgress as WizardProgress | null;

  // Backfill-on-demand for pre-existing entities:
  // If nothing meaningful is stored AND the entity already has substantive
  // data (COA imported OR posted JEs OR active holdings), mark all four
  // wizard steps complete so the dashboard banner + header banner don't
  // nag the user about setup that's already done.
  if (isDefaultProgress(stored)) {
    const [accountCount, postedJECount, holdingCount] = await Promise.all([
      prisma.account.count({ where: { entityId } }),
      prisma.journalEntry.count({
        where: { entityId, status: "POSTED" },
      }),
      prisma.subledgerItem.count({
        where: { entityId, isActive: true },
      }),
    ]);

    if (hasSubstantiveData({ accountCount, postedJECount, holdingCount })) {
      const backfilled = backfillCompleteProgress();
      await prisma.entity.update({
        where: { id: entityId },
        data: {
          wizardProgress: backfilled as unknown as Prisma.InputJsonValue,
        },
      });
      return successResponse(backfilled);
    }
  }

  const progress = stored ?? DEFAULT_PROGRESS;
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
    data: { wizardProgress: merged as unknown as Prisma.InputJsonValue },
  });

  return successResponse(merged);
}
