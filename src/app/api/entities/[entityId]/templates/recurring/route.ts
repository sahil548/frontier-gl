import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";

const setupSchema = z.object({
  templateId: z.string().min(1),
  frequency: z.enum(["monthly", "quarterly", "annually"]),
  nextRunDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "nextRunDate must be a valid date",
  }),
});

/**
 * POST /api/entities/:entityId/templates/recurring
 *
 * Either sets up a template as recurring, or generates pending recurring JEs.
 * Action determined by body: { action: "setup", ... } or { action: "generate" }
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

  // ── Setup: make a template recurring ──
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

  // ── Stop: disable recurring ──
  if (action === "stop") {
    const templateId = body.templateId as string;
    if (!templateId) return errorResponse("templateId required", 400);

    await prisma.journalEntryTemplate.update({
      where: { id: templateId },
      data: { isRecurring: false, frequency: null, nextRunDate: null },
    });

    return successResponse({ message: "Recurring stopped" });
  }

  // ── Generate: create draft JEs for all due recurring templates ──
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

      const entryNumber = await prisma.$transaction(async (tx) => {
        const num = await generateNextEntryNumber(tx, entityId);

        const je = await tx.journalEntry.create({
          data: {
            entityId,
            entryNumber: num,
            date: template.nextRunDate!,
            description: `${template.name} (recurring)`,
            status: "DRAFT",
            createdBy: userId,
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
        ...entryNumber,
        templateName: template.name,
        date: template.nextRunDate!.toISOString(),
      });
    }

    return successResponse({ generated: entries.length, entries }, 201);
  }

  return errorResponse("Invalid action. Use 'setup', 'stop', or 'generate'.", 400);
}
