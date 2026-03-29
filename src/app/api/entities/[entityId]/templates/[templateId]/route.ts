import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1),
        debit: z.number().min(0).default(0),
        credit: z.number().min(0).default(0),
        memo: z.string().optional(),
      })
    )
    .min(1)
    .optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTemplate(template: any) {
  return {
    id: template.id,
    entityId: template.entityId,
    name: template.name,
    description: template.description,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lines: template.lines?.map((l: any, idx: number) => ({
      id: l.id,
      accountId: l.accountId,
      debit: l.debit?.toString() ?? "0",
      credit: l.credit?.toString() ?? "0",
      memo: l.memo,
      sortOrder: l.sortOrder ?? idx,
      account: l.account
        ? { id: l.account.id, number: l.account.number, name: l.account.name, type: l.account.type }
        : undefined,
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; templateId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, templateId } = await params;

  const template = await prisma.journalEntryTemplate.findFirst({
    where: { id: templateId, entityId },
    include: {
      lines: {
        include: {
          account: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!template) return errorResponse("Template not found", 404);
  return successResponse(serializeTemplate(template));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string; templateId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, templateId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = updateTemplateSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const existing = await prisma.journalEntryTemplate.findFirst({
    where: { id: templateId, entityId },
  });
  if (!existing) return errorResponse("Template not found", 404);

  const { name, description, lines } = result.data;

  // If name changed, check uniqueness
  if (name && name !== existing.name) {
    const dup = await prisma.journalEntryTemplate.findUnique({
      where: { entityId_name: { entityId, name } },
    });
    if (dup) return errorResponse(`Template "${name}" already exists`, 409);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Delete old lines and recreate if lines provided
    if (lines) {
      await tx.journalEntryTemplateLine.deleteMany({
        where: { templateId },
      });
    }

    return tx.journalEntryTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(lines
          ? {
              lines: {
                create: lines.map((line, idx) => ({
                  accountId: line.accountId,
                  debit: line.debit,
                  credit: line.credit,
                  memo: line.memo,
                  sortOrder: idx,
                })),
              },
            }
          : {}),
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, number: true, name: true, type: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  return successResponse(serializeTemplate(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; templateId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, templateId } = await params;

  const existing = await prisma.journalEntryTemplate.findFirst({
    where: { id: templateId, entityId },
  });
  if (!existing) return errorResponse("Template not found", 404);

  await prisma.journalEntryTemplate.delete({
    where: { id: templateId },
  });

  return successResponse({ message: "Template deleted" });
}
