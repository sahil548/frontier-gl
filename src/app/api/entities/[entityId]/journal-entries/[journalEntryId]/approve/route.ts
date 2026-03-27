import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * POST /api/entities/:entityId/journal-entries/:journalEntryId/approve
 *
 * Transitions a DRAFT journal entry to APPROVED status.
 * Records audit trail with approver info.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, journalEntryId } = await params;

  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
  });

  if (!je) {
    return errorResponse("Journal entry not found", 404);
  }

  if (je.status === "POSTED") {
    return errorResponse("Cannot approve a posted entry", 400);
  }

  if (je.status === "APPROVED") {
    return errorResponse("Journal entry is already approved", 400);
  }

  if (je.status !== "DRAFT") {
    return errorResponse("Only draft entries can be approved", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: new Date(),
      },
      include: {
        lineItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    await tx.journalEntryAudit.create({
      data: {
        journalEntryId,
        action: "APPROVED",
        userId,
      },
    });

    return entry;
  });

  return successResponse({
    id: updated.id,
    entryNumber: updated.entryNumber,
    status: updated.status,
    approvedBy: updated.approvedBy,
    approvedAt: updated.approvedAt?.toISOString() ?? null,
  });
}
