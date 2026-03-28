import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const templateLineSchema = z.object({
  accountId: z.string().min(1),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  memo: z.string().optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  lines: z.array(templateLineSchema).min(1),
});

function serializeTemplate(template: {
  id: string;
  entityId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lines?: any[];
}) {
  return {
    id: template.id,
    entityId: template.entityId,
    name: template.name,
    description: template.description,
    createdBy: template.createdBy,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    lines: template.lines?.map((l, idx) => ({
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
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  const templates = await prisma.journalEntryTemplate.findMany({
    where: { entityId },
    include: {
      lines: {
        include: {
          account: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return successResponse(templates.map(serializeTemplate));
}

export async function POST(
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

  const result = createTemplateSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const { name, description, lines } = result.data;

  // Check name uniqueness
  const existing = await prisma.journalEntryTemplate.findUnique({
    where: { entityId_name: { entityId, name } },
  });
  if (existing) return errorResponse(`Template "${name}" already exists`, 409);

  const template = await prisma.journalEntryTemplate.create({
    data: {
      entityId,
      name,
      description,
      createdBy: userId,
      lines: {
        create: lines.map((line, idx) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          memo: line.memo,
          sortOrder: idx,
        })),
      },
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

  return successResponse(serializeTemplate(template), 201);
}
