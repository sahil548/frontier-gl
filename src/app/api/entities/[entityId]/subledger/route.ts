import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { AccountType } from "@/generated/prisma/client";

/**
 * Maps SubledgerItemType → parent account number prefix + GL AccountType.
 * When a holding is created, a GL leaf account is auto-created under the
 * matching parent account.
 */
const HOLDING_TYPE_TO_GL: Record<string, { parentPrefix: string; accountType: AccountType }> = {
  BANK_ACCOUNT: { parentPrefix: "11000", accountType: "ASSET" },
  INVESTMENT: { parentPrefix: "12000", accountType: "ASSET" },
  REAL_ESTATE: { parentPrefix: "16000", accountType: "ASSET" },
  LOAN: { parentPrefix: "22000", accountType: "LIABILITY" },
  PRIVATE_EQUITY: { parentPrefix: "13000", accountType: "ASSET" },
  RECEIVABLE: { parentPrefix: "14000", accountType: "ASSET" },
  OTHER: { parentPrefix: "18000", accountType: "ASSET" },
};

const createSchema = z.object({
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
    plaidConnection: item.plaidConnection
      ? {
          status: item.plaidConnection.status,
          institutionName: item.plaidConnection.institutionName,
          lastSyncAt: item.plaidConnection.lastSyncAt?.toISOString() ?? null,
          error: item.plaidConnection.error,
        }
      : null,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(itemType ? { itemType: itemType as any } : {}),
    },
    include: {
      account: { select: { id: true, number: true, name: true, type: true } },
      _count: { select: { reconciliations: true } },
      plaidConnection: {
        select: { status: true, institutionName: true, lastSyncAt: true, error: true },
      },
    },
    orderBy: [{ account: { number: "asc" } }, { name: "asc" }],
  });

  return successResponse(items.map(serialize));
}

/**
 * POST /api/entities/:entityId/subledger
 *
 * Auto-creates a GL leaf account under the appropriate parent based on holding type.
 * The holding name becomes the account name. No manual GL account selection needed.
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

  // Determine GL parent from holding type
  const glMapping = HOLDING_TYPE_TO_GL[data.itemType];
  if (!glMapping) return errorResponse("Unknown holding type", 400);

  // Find the parent account by number prefix
  const parentAccount = await prisma.account.findFirst({
    where: { entityId, number: glMapping.parentPrefix, isActive: true },
  });
  if (!parentAccount) {
    return errorResponse(
      `GL parent account ${glMapping.parentPrefix} not found. Ensure the Chart of Accounts has been set up.`,
      400
    );
  }

  // Auto-generate next account number under this parent
  const siblings = await prisma.account.findMany({
    where: { entityId, parentId: parentAccount.id },
    orderBy: { number: "desc" },
    take: 1,
  });
  const parentNum = parseInt(parentAccount.number, 10);
  const nextNumber = siblings.length === 0
    ? (parentNum + 100).toString()
    : (parseInt(siblings[0].number, 10) + 100).toString();

  // Check for duplicate account number
  const existing = await prisma.account.findFirst({
    where: { entityId, number: nextNumber },
  });
  if (existing) {
    return errorResponse(`Account number ${nextNumber} already exists`, 409);
  }

  // Create GL account + holding in a single transaction
  const item = await prisma.$transaction(async (tx) => {
    // Create the GL leaf account
    const newAccount = await tx.account.create({
      data: {
        entityId,
        number: nextNumber,
        name: data.name,
        type: glMapping.accountType,
        parentId: parentAccount.id,
      },
    });

    // Create empty balance record
    await tx.accountBalance.create({
      data: { accountId: newAccount.id, balance: 0 },
    });

    // Create the subledger item linked to the new account
    const subledgerItem = await tx.subledgerItem.create({
      data: {
        entityId,
        accountId: newAccount.id,
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

    return subledgerItem;
  });

  return successResponse(serialize(item), 201);
}
