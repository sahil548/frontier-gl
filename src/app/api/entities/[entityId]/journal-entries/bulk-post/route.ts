import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { bulkPostEntries } from "@/lib/journal-entries/bulk-post";

/**
 * POST /api/entities/:entityId/journal-entries/bulk-post
 *
 * Posts multiple journal entries in a single atomic transaction.
 * All entries must belong to the entity. All-or-nothing semantics.
 */

const bulkPostSchema = z.object({
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

  const result = bulkPostSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { ids } = result.data;

  // Verify all entries belong to this entity
  const entries = await prisma.journalEntry.findMany({
    where: { id: { in: ids }, entityId },
    select: { id: true },
  });

  if (entries.length !== ids.length) {
    return errorResponse(
      "One or more journal entry IDs are invalid or do not belong to this entity",
      400
    );
  }

  try {
    const postedNumbers = await bulkPostEntries(ids, userId);

    return successResponse({
      posted: postedNumbers,
      count: postedNumbers.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bulk post failed";
    return errorResponse(message, 400);
  }
}
