import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  costBasis: z.number().optional(),
  fairMarketValue: z.number().optional(),
  currentBalance: z.number().optional(),
  counterparty: z.string().optional(),
  referenceNumber: z.string().optional(),
  acquiredDate: z.string().optional(),
  maturityDate: z.string().optional(),
  interestRate: z.number().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(item: any) {
  return {
    id: item.id,
    entityId: item.entityId,
    accountId: item.accountId,
    name: item.name,
    itemType: item.itemType,
    costBasis: item.costBasis?.toString() ?? null,
    fairMarketValue: item.fairMarketValue?.toString() ?? null,
    currentBalance: item.currentBalance?.toString() ?? "0",
    counterparty: item.counterparty,
    referenceNumber: item.referenceNumber,
    acquiredDate: item.acquiredDate?.toISOString() ?? null,
    maturityDate: item.maturityDate?.toISOString() ?? null,
    interestRate: item.interestRate?.toString() ?? null,
    notes: item.notes,
    isActive: item.isActive,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    account: item.account
      ? { id: item.account.id, number: item.account.number, name: item.account.name, type: item.account.type }
      : undefined,
    reconciliations: item.reconciliations?.map((r: { id: string; statementDate: Date; statementBalance: { toString(): string }; glBalance: { toString(): string }; difference: { toString(): string }; status: string; reconciledAt: Date | null }) => ({
      id: r.id,
      statementDate: r.statementDate.toISOString(),
      statementBalance: r.statementBalance.toString(),
      glBalance: r.glBalance.toString(),
      difference: r.difference.toString(),
      status: r.status,
      reconciledAt: r.reconciledAt?.toISOString() ?? null,
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  const item = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      reconciliations: {
        orderBy: { statementDate: "desc" },
        take: 10,
      },
    },
  });

  if (!item) return errorResponse("Subledger item not found", 404);
  return successResponse(serialize(item));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const existing = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
  });
  if (!existing) return errorResponse("Subledger item not found", 404);

  const data = result.data;
  const updated = await prisma.subledgerItem.update({
    where: { id: itemId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.costBasis !== undefined ? { costBasis: data.costBasis } : {}),
      ...(data.fairMarketValue !== undefined ? { fairMarketValue: data.fairMarketValue } : {}),
      ...(data.currentBalance !== undefined ? { currentBalance: data.currentBalance } : {}),
      ...(data.counterparty !== undefined ? { counterparty: data.counterparty } : {}),
      ...(data.referenceNumber !== undefined ? { referenceNumber: data.referenceNumber } : {}),
      ...(data.acquiredDate !== undefined ? { acquiredDate: data.acquiredDate ? new Date(data.acquiredDate) : null } : {}),
      ...(data.maturityDate !== undefined ? { maturityDate: data.maturityDate ? new Date(data.maturityDate) : null } : {}),
      ...(data.interestRate !== undefined ? { interestRate: data.interestRate } : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      reconciliations: {
        orderBy: { statementDate: "desc" },
        take: 10,
      },
    },
  });

  return successResponse(serialize(updated));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  const existing = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
  });
  if (!existing) return errorResponse("Subledger item not found", 404);

  await prisma.subledgerItem.update({
    where: { id: itemId },
    data: { isActive: false },
  });

  return successResponse({ message: "Subledger item deactivated" });
}
