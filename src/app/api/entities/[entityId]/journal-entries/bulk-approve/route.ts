import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * POST /api/entities/:entityId/journal-entries/bulk-approve
 *
 * Approves multiple DRAFT journal entries in a single atomic transaction.
 * Entries that are not DRAFT are skipped (only DRAFT entries are approved).
 */

const bulkApproveSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one ID is required"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = bulkApproveSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { ids } = result.data;

  // Verify all entries belong to this entity
  const entries = await prisma.journalEntry.findMany({
    where: { id: { in: ids }, entityId },
    select: { id: true, status: true, entryNumber: true },
  });

  if (entries.length !== ids.length) {
    return errorResponse(
      "One or more journal entry IDs are invalid or do not belong to this entity",
      400
    );
  }

  // Filter to only DRAFT entries
  const draftEntries = entries.filter((e) => e.status === "DRAFT");

  if (draftEntries.length === 0) {
    return errorResponse("No draft entries found to approve", 400);
  }

  const draftIds = draftEntries.map((e) => e.id);
  const now = new Date();

  const approvedNumbers = await prisma.$transaction(async (tx) => {
    // Update all draft entries to APPROVED
    await tx.journalEntry.updateMany({
      where: { id: { in: draftIds } },
      data: {
        status: "APPROVED",
        approvedBy: userId,
        approvedAt: now,
      },
    });

    // Create audit entries for each
    await tx.journalEntryAudit.createMany({
      data: draftIds.map((id) => ({
        journalEntryId: id,
        action: "APPROVED",
        userId,
      })),
    });

    return draftEntries.map((e) => e.entryNumber);
  });

  return successResponse({
    approved: approvedNumbers,
    count: approvedNumbers.length,
  });
}
