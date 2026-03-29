import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { Prisma } from "@/generated/prisma/client";

const setupSchema = z.object({
  templateId: z.string().min(1),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
  nextRunDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "nextRunDate must be a valid date",
  }),
});

const patchSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  frequency: z.enum(["monthly", "quarterly", "annually"]).optional(),
  nextRunDate: z
    .string()
    .refine((s) => !isNaN(Date.parse(s)), {
      message: "nextRunDate must be a valid date",
    })
    .optional(),
  lines: z
    .array(
      z.object({
        accountId: z.string().min(1),
        debit: z.union([z.string(), z.number()]).transform((v) => String(v)),
        credit: z.union([z.string(), z.number()]).transform((v) => String(v)),
        memo: z.string().optional().default(""),
      })
    )
    .optional(),
});

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

/**
 * GET /api/entities/:entityId/templates/recurring
 *
 * Returns all recurring templates for the entity with computed status.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  const templates = await prisma.journalEntryTemplate.findMany({
    where: { entityId, isRecurring: true },
    include: {
      lines: {
        include: {
          account: { select: { id: true, number: true, name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const serialized = templates.map((t) => {
    let status: "active" | "stopped" | "overdue" = "active";
    if (!t.nextRunDate) {
      status = "stopped";
    } else if (t.nextRunDate <= today) {
      status = "overdue";
    }

    return {
      id: t.id,
      name: t.name,
      description: t.description,
      frequency: t.frequency,
      isRecurring: t.isRecurring,
      nextRunDate: t.nextRunDate?.toISOString() ?? null,
      lastRunDate: t.lastRunDate?.toISOString() ?? null,
      status,
      lines: t.lines.map((l) => ({
        id: l.id,
        accountId: l.accountId,
        accountName: l.account?.name ?? "",
        accountNumber: l.account?.number ?? "",
        debit: serializeDecimal(l.debit),
        credit: serializeDecimal(l.credit),
        memo: l.memo ?? "",
        sortOrder: l.sortOrder,
      })),
    };
  });

  return successResponse(serialized);
}

/**
 * PATCH /api/entities/:entityId/templates/recurring
 *
 * Edit an active recurring template's fields and/or lines.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = patchSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { templateId, name, description, frequency, nextRunDate, lines } = result.data;

  const template = await prisma.journalEntryTemplate.findFirst({
    where: { id: templateId, entityId, isRecurring: true },
  });
  if (!template) return errorResponse("Active recurring template not found", 404);

  const updated = await prisma.$transaction(async (tx) => {
    // Update template fields
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (nextRunDate !== undefined) updateData.nextRunDate = new Date(nextRunDate);

    const tpl = await tx.journalEntryTemplate.update({
      where: { id: templateId },
      data: updateData,
    });

    // Replace lines if provided
    if (lines !== undefined) {
      await tx.journalEntryTemplateLine.deleteMany({
        where: { templateId },
      });
      if (lines.length > 0) {
        await tx.journalEntryTemplateLine.createMany({
          data: lines.map((l, idx) => ({
            templateId,
            accountId: l.accountId,
            debit: new Prisma.Decimal(l.debit || "0"),
            credit: new Prisma.Decimal(l.credit || "0"),
            memo: l.memo || null,
            sortOrder: idx,
          })),
        });
      }
    }

    // Re-fetch with lines
    return tx.journalEntryTemplate.findUnique({
      where: { id: templateId },
      include: {
        lines: {
          include: {
            account: { select: { id: true, number: true, name: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
  });

  if (!updated) return errorResponse("Template not found after update", 500);

  return successResponse({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    frequency: updated.frequency,
    nextRunDate: updated.nextRunDate?.toISOString() ?? null,
    lastRunDate: updated.lastRunDate?.toISOString() ?? null,
    isRecurring: updated.isRecurring,
    lines: updated.lines.map((l) => ({
      id: l.id,
      accountId: l.accountId,
      accountName: l.account?.name ?? "",
      accountNumber: l.account?.number ?? "",
      debit: serializeDecimal(l.debit),
      credit: serializeDecimal(l.credit),
      memo: l.memo ?? "",
      sortOrder: l.sortOrder,
    })),
  });
}

/**
 * POST /api/entities/:entityId/templates/recurring
 *
 * Either sets up a template as recurring, stops it, or generates pending recurring JEs.
 * Action determined by body: { action: "setup" | "stop" | "generate" }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const action = body.action as string;

  // -- Setup: make a template recurring --
  if (action === "setup") {
    const result = setupSchema.safeParse(body);
    if (!result.success) return errorResponse("Validation failed", 400, result.error);

    const { templateId, frequency, nextRunDate } = result.data;

    const template = await prisma.journalEntryTemplate.findFirst({
      where: { id: templateId, entityId },
    });
    if (!template) return errorResponse("Template not found", 404);

    const updated = await prisma.journalEntryTemplate.update({
      where: { id: templateId },
      data: {
        isRecurring: true,
        frequency,
        nextRunDate: new Date(nextRunDate),
      },
    });

    return successResponse({
      id: updated.id,
      name: updated.name,
      isRecurring: updated.isRecurring,
      frequency: updated.frequency,
      nextRunDate: updated.nextRunDate?.toISOString() ?? null,
    });
  }

  // -- Stop: disable recurring --
  if (action === "stop") {
    const templateId = body.templateId as string;
    if (!templateId) return errorResponse("templateId required", 400);

    await prisma.journalEntryTemplate.update({
      where: { id: templateId },
      data: { isRecurring: false, frequency: null, nextRunDate: null },
    });

    return successResponse({ message: "Recurring stopped" });
  }

  // -- Generate: create draft JEs for all due recurring templates --
  if (action === "generate") {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueTemplates = await prisma.journalEntryTemplate.findMany({
      where: {
        entityId,
        isRecurring: true,
        nextRunDate: { lte: today },
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, number: true, name: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (dueTemplates.length === 0) {
      return successResponse({ generated: 0, entries: [] });
    }

    const entries = [];

    for (const template of dueTemplates) {
      if (template.lines.length === 0) continue;

      const entryResult = await prisma.$transaction(async (tx) => {
        const num = await generateNextEntryNumber(tx, entityId);

        const je = await tx.journalEntry.create({
          data: {
            entityId,
            entryNumber: num,
            date: template.nextRunDate!,
            description: `${template.name} (recurring)`,
            status: "DRAFT",
            createdBy: userId,
            templateId: template.id,
            lineItems: {
              create: template.lines.map((line, idx) => ({
                accountId: line.accountId,
                debit: Number(line.debit),
                credit: Number(line.credit),
                memo: line.memo,
                sortOrder: idx,
              })),
            },
          },
        });

        await tx.journalEntryAudit.create({
          data: {
            journalEntryId: je.id,
            action: "RECURRING_GENERATED",
            userId,
          },
        });

        // Advance nextRunDate
        const nextDate = new Date(template.nextRunDate!);
        switch (template.frequency) {
          case "monthly":
            nextDate.setMonth(nextDate.getMonth() + 1);
            break;
          case "quarterly":
            nextDate.setMonth(nextDate.getMonth() + 3);
            break;
          case "annually":
            nextDate.setFullYear(nextDate.getFullYear() + 1);
            break;
        }

        await tx.journalEntryTemplate.update({
          where: { id: template.id },
          data: {
            lastRunDate: template.nextRunDate,
            nextRunDate: nextDate,
          },
        });

        return { id: je.id, entryNumber: num };
      });

      entries.push({
        ...entryResult,
        templateName: template.name,
        date: template.nextRunDate!.toISOString(),
      });
    }

    return successResponse({ generated: entries.length, entries }, 201);
  }

  return errorResponse("Invalid action. Use 'setup', 'stop', or 'generate'.", 400);
}
