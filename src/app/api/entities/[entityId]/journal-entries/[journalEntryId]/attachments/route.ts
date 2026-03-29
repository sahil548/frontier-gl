import { auth } from "@clerk/nextjs/server";
import { put, del } from "@vercel/blob";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

type RouteContext = {
  params: Promise<{ entityId: string; journalEntryId: string }>;
};

/**
 * GET /api/entities/:entityId/journal-entries/:journalEntryId/attachments
 * List attachments for a journal entry.
 */
export async function GET(_req: Request, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, journalEntryId } = await ctx.params;

  // Verify JE belongs to entity
  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
    select: { id: true },
  });
  if (!je) return errorResponse("Journal entry not found", 404);

  const attachments = await prisma.attachment.findMany({
    where: { journalEntryId },
    orderBy: { createdAt: "desc" },
  });

  return successResponse(attachments);
}

/**
 * POST /api/entities/:entityId/journal-entries/:journalEntryId/attachments
 * Upload a file attachment to a journal entry.
 */
export async function POST(req: Request, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, journalEntryId } = await ctx.params;

  // Verify JE belongs to entity
  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
    select: { id: true },
  });
  if (!je) return errorResponse("Journal entry not found", 404);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return errorResponse("No file provided", 400);
  if (!ALLOWED_TYPES.includes(file.type)) {
    return errorResponse(
      `File type not allowed. Accepted: PDF, PNG, JPG, HEIC.`,
      400
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("File size exceeds 10 MB limit", 400);
  }

  // Upload to Vercel Blob
  const blob = await put(
    `attachments/${entityId}/${journalEntryId}/${file.name}`,
    file,
    { access: "public", contentType: file.type }
  );

  // Create database record
  const attachment = await prisma.attachment.create({
    data: {
      journalEntryId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      url: blob.url,
      uploadedBy: userId,
    },
  });

  return successResponse(attachment, 201);
}

/**
 * DELETE /api/entities/:entityId/journal-entries/:journalEntryId/attachments?id=xxx
 * Delete an attachment.
 */
export async function DELETE(req: Request, ctx: RouteContext) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId, journalEntryId } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const attachmentId = searchParams.get("id");

  if (!attachmentId) return errorResponse("Attachment ID required", 400);

  // Verify JE belongs to entity
  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
    select: { id: true },
  });
  if (!je) return errorResponse("Journal entry not found", 404);

  // Find attachment and verify it belongs to this JE
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, journalEntryId },
  });
  if (!attachment) return errorResponse("Attachment not found", 404);

  // Delete from Vercel Blob
  await del(attachment.url);

  // Delete database record
  await prisma.attachment.delete({ where: { id: attachmentId } });

  return successResponse({ deleted: true });
}
