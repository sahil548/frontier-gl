import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  positionType: z.enum([
    "CASH",
    "PUBLIC_EQUITY",
    "FIXED_INCOME",
    "MUTUAL_FUND",
    "ETF",
    "PRIVATE_EQUITY",
    "REAL_PROPERTY",
    "ACCUMULATED_DEPRECIATION",
    "OTHER",
  ]),
  quantity: z.number().optional(),
  unitCost: z.number().optional(),
  unitPrice: z.number().optional(),
  costBasis: z.number().optional(),
  marketValue: z.number().default(0),
  ticker: z.string().optional(),
  assetClass: z.string().optional(),
  acquiredDate: z.string().optional(),
  notes: z.string().optional(),
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

/** Recompute SubledgerItem.currentBalance as sum of active position marketValues */
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

/**
 * GET /api/entities/:entityId/subledger/:itemId/positions
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  // Verify item belongs to entity
  const item = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
  });
  if (!item) return errorResponse("Subledger item not found", 404);

  const positions = await prisma.position.findMany({
    where: { subledgerItemId: itemId, isActive: true },
    orderBy: [{ positionType: "asc" }, { name: "asc" }],
  });

  return successResponse(positions.map(serialize));
}

/**
 * POST /api/entities/:entityId/subledger/:itemId/positions
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string; itemId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId, itemId } = await params;

  // Verify item belongs to entity
  const item = await prisma.subledgerItem.findFirst({
    where: { id: itemId, entityId },
  });
  if (!item) return errorResponse("Subledger item not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  const result = createSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const data = result.data;

  // Auto-compute costBasis from quantity × unitCost if not provided
  let costBasis = data.costBasis;
  if (costBasis === undefined && data.quantity !== undefined && data.unitCost !== undefined) {
    costBasis = data.quantity * data.unitCost;
  }

  // Auto-compute marketValue from quantity × unitPrice if not provided
  let marketValue = data.marketValue;
  if (marketValue === 0 && data.quantity !== undefined && data.unitPrice !== undefined) {
    marketValue = data.quantity * data.unitPrice;
  }

  const position = await prisma.position.create({
    data: {
      subledgerItemId: itemId,
      name: data.name,
      positionType: data.positionType,
      quantity: data.quantity,
      unitCost: data.unitCost,
      unitPrice: data.unitPrice,
      costBasis,
      marketValue,
      ticker: data.ticker,
      assetClass: data.assetClass,
      acquiredDate: data.acquiredDate ? new Date(data.acquiredDate) : null,
      notes: data.notes,
    },
  });

  await syncParentBalance(itemId);

  return successResponse(serialize(position), 201);
}
