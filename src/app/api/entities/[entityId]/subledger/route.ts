import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const createSchema = z.object({
  accountId: z.string().min(1),
  name: z.string().min(1).max(200),
  itemType: z.enum([
    "BANK_ACCOUNT",
    "INVESTMENT",
    "REAL_ESTATE",
    "LOAN",
    "PRIVATE_EQUITY",
    "RECEIVABLE",
    "OTHER",
  ]),
  costBasis: z.number().optional(),
  fairMarketValue: z.number().optional(),
  currentBalance: z.number().default(0),
  counterparty: z.string().optional(),
  referenceNumber: z.string().optional(),
  acquiredDate: z.string().optional(),
  maturityDate: z.string().optional(),
  interestRate: z.number().optional(),
  notes: z.string().optional(),
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
    _reconciliationCount: item._count?.reconciliations ?? 0,
  };
}

/**
 * GET /api/entities/:entityId/subledger
 *
 * Query params:
 *   accountId — filter by GL account (optional)
 *   itemType — filter by type (optional)
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);
  const { entityId } = await params;

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const itemType = url.searchParams.get("itemType");

  const items = await prisma.subledgerItem.findMany({
    where: {
      entityId,
      isActive: true,
      ...(accountId ? { accountId } : {}),
      ...(itemType ? { itemType: itemType as import("@prisma/client").SubledgerItemType } : {}),
    },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      _count: { select: { reconciliations: true } },
    },
    orderBy: [{ account: { number: "asc" } }, { name: "asc" }],
  });

  return successResponse(items.map(serialize));
}

/**
 * POST /api/entities/:entityId/subledger
 */
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

  const result = createSchema.safeParse(body);
  if (!result.success) return errorResponse("Validation failed", 400, result.error);

  const data = result.data;

  // Verify account belongs to entity
  const account = await prisma.account.findFirst({
    where: { id: data.accountId, entityId, isActive: true },
  });
  if (!account) return errorResponse("Account not found", 404);

  const item = await prisma.subledgerItem.create({
    data: {
      entityId,
      accountId: data.accountId,
      name: data.name,
      itemType: data.itemType,
      costBasis: data.costBasis,
      fairMarketValue: data.fairMarketValue,
      currentBalance: data.currentBalance,
      counterparty: data.counterparty,
      referenceNumber: data.referenceNumber,
      acquiredDate: data.acquiredDate ? new Date(data.acquiredDate) : null,
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
      interestRate: data.interestRate,
      notes: data.notes,
    },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      _count: { select: { reconciliations: true } },
    },
  });

  return successResponse(serialize(item), 201);
}
