import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  positionType: z
    .enum([
      "CASH",
      "PUBLIC_EQUITY",
      "FIXED_INCOME",
      "MUTUAL_FUND",
      "ETF",
      "PRIVATE_EQUITY",
      "REAL_PROPERTY",
      "ACCUMULATED_DEPRECIATION",
      "OTHER",
    ])
    .optional(),
  quantity: z.number().nullable().optional(),
  unitCost: z.number().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  costBasis: z.number().nullable().optional(),
  marketValue: z.number().optional(),
  ticker: z.string().nullable().optional(),
  assetClass: z.string().nullable().optional(),
  acquiredDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(p: any) {
  return {
    id: p.id,
    subledgerItemId: p.subledgerItemId,
    name: p.name,
    positionType: p.positionType,
    quantity: p.quantity?.toString() ?? null,
    unitCost: p.unitCost?.toString() ?? null,
    unitPrice: p.unitPrice?.toString() ?? null,
    costBasis: p.costBasis?.toString() ?? null,
    marketValue: p.marketValue?.toString() ?? "0",
    ticker: p.ticker,
    assetClass: p.assetClass,
    acquiredDate: p.acquiredDate?.toISOString().split("T")[0] ?? null,
    notes: p.notes,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function syncParentBalance(subledgerItemId: string) {
  const agg = await prisma.position.aggregate({
    where: { subledgerItemId, isActive: true },
    _sum: { marketValue: true },
  });
  await prisma.subledgerItem.update({
    where: { id: subledgerItemId },
    data: { currentBalance: agg._sum.marketValue ?? 0 },
  });
}

async function resolvePosition(
  entityId: string,
  itemId: string,
  positionId: string
) {
  return prisma.position.findFirst({
    where: {
      id: positionId,
      subledgerItemId: itemId,
      subledgerItem: { entityId },
    },
  });
}

/**
 * GET /api/entities/:entityId/subledger/:itemId/positions/:positionId
 */
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ entityId: string; itemId: string; positionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId, positionId } = await params;

  const position = await resolvePosition(entityId, itemId, positionId);
  if (!position) return errorResponse("Position not found", 404);

  return successResponse(serialize(position));
}

/**
 * PUT /api/entities/:entityId/subledger/:itemId/positions/:positionId
 */
export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ entityId: string; itemId: string; positionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId, positionId } = await params;

  const existing = await resolvePosition(entityId, itemId, positionId);
  if (!existing) return errorResponse("Position not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = updateSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const data = result.data;

  // Recompute derived fields if inputs changed
  const quantity = data.quantity !== undefined ? data.quantity : Number(existing.quantity);
  const unitCost = data.unitCost !== undefined ? data.unitCost : Number(existing.unitCost);
  const unitPrice = data.unitPrice !== undefined ? data.unitPrice : Number(existing.unitPrice);

  let costBasis = data.costBasis !== undefined ? data.costBasis : Number(existing.costBasis ?? 0);
  if (
    data.quantity !== undefined ||
    data.unitCost !== undefined
  ) {
    if (quantity && unitCost) costBasis = quantity * unitCost;
  }

  let marketValue =
    data.marketValue !== undefined ? data.marketValue : Number(existing.marketValue);
  if (data.quantity !== undefined || data.unitPrice !== undefined) {
    if (quantity && unitPrice) marketValue = quantity * unitPrice;
  }

  const position = await prisma.position.update({
    where: { id: positionId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.positionType !== undefined ? { positionType: data.positionType } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.unitCost !== undefined ? { unitCost: data.unitCost } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      costBasis,
      marketValue,
      ...(data.ticker !== undefined ? { ticker: data.ticker } : {}),
      ...(data.assetClass !== undefined ? { assetClass: data.assetClass } : {}),
      ...(data.acquiredDate !== undefined
        ? { acquiredDate: data.acquiredDate ? new Date(data.acquiredDate) : null }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
    },
  });

  await syncParentBalance(itemId);

  return successResponse(serialize(position));
}

/**
 * DELETE /api/entities/:entityId/subledger/:itemId/positions/:positionId
 * Soft-deletes by setting isActive = false
 */
export async function DELETE(
  _request: Request,
  {
    params,
  }: { params: Promise<{ entityId: string; itemId: string; positionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId, positionId } = await params;

  const existing = await resolvePosition(entityId, itemId, positionId);
  if (!existing) return errorResponse("Position not found", 404);

  await prisma.position.update({
    where: { id: positionId },
    data: { isActive: false },
  });

  await syncParentBalance(itemId);

  return successResponse({ deleted: true });
}
