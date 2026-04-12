import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import {
  HOLDING_TYPE_TO_GL,
  DEFAULT_POSITION_NAME,
  DEFAULT_POSITION_TYPE,
} from "@/lib/holdings/constants";
import {
  createHoldingSummaryAccount,
  createPositionGLAccount,
} from "@/lib/holdings/position-gl";
import { generateOpeningBalanceJE } from "@/lib/bank-transactions/opening-balance";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  itemType: z.enum([
    // New canonical types (13)
    "BANK_ACCOUNT",
    "BROKERAGE_ACCOUNT",
    "CREDIT_CARD",
    "REAL_ESTATE",
    "EQUIPMENT",
    "LOAN",
    "PRIVATE_FUND",
    "MORTGAGE",
    "LINE_OF_CREDIT",
    "TRUST_ACCOUNT",
    "OPERATING_BUSINESS",
    "NOTES_RECEIVABLE",
    "OTHER",
    // Legacy types (backward compat)
    "INVESTMENT",
    "PRIVATE_EQUITY",
    "RECEIVABLE",
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
  openingBalanceDate: z.string().optional(),
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
    positions: item.positions?.map((p: { id: string; name: string; accountId: string | null; positionType: string; marketValue: { toString(): string } }) => ({
      id: p.id,
      name: p.name,
      accountId: p.accountId,
      positionType: p.positionType,
      marketValue: p.marketValue?.toString() ?? "0",
    })) ?? [],
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
      positions: {
        where: { isActive: true },
        select: { id: true, name: true, accountId: true, positionType: true, marketValue: true },
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

  // Create GL hierarchy + holding + default position in a single transaction
  const item = await prisma.$transaction(async (tx) => {
    // 1. Create the holding's summary GL account under the type parent
    const summaryAccount = await createHoldingSummaryAccount(
      tx as never,
      entityId,
      glMapping.parentPrefix,
      data.name,
      glMapping.accountType
    );

    // 2. Create the SubledgerItem pointing to the summary account
    const subledgerItem = await tx.subledgerItem.create({
      data: {
        entityId,
        accountId: summaryAccount.id,
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
    });

    // 3. Create the default position's GL leaf account under the summary
    const defaultPositionName = DEFAULT_POSITION_NAME[data.itemType] || "General";
    const positionGLAccount = await createPositionGLAccount(
      tx as never,
      entityId,
      summaryAccount.id,
      defaultPositionName,
      glMapping.accountType
    );

    // 4. Create the default Position linked to the GL leaf account
    const defaultPositionType = DEFAULT_POSITION_TYPE[data.itemType] || "OTHER";
    await tx.position.create({
      data: {
        subledgerItemId: subledgerItem.id,
        accountId: positionGLAccount.id,
        name: defaultPositionName,
        positionType: defaultPositionType as never,
        marketValue: data.currentBalance ?? 0,
      },
    });

    // 5. Generate opening balance JE if balance is non-zero
    let openingBalanceJEId: string | null = null;
    if (data.currentBalance && data.currentBalance !== 0) {
      openingBalanceJEId = await generateOpeningBalanceJE(tx, {
        entityId,
        userId: userId!,
        holdingAccountId: positionGLAccount.id,
        holdingAccountType: glMapping.accountType,
        balance: data.currentBalance,
        date: data.openingBalanceDate ? new Date(data.openingBalanceDate) : new Date(),
      });
    }

    // Re-fetch with includes for serialization
    const fullItem = await tx.subledgerItem.findUniqueOrThrow({
      where: { id: subledgerItem.id },
      include: {
        account: { select: { id: true, number: true, name: true, type: true } },
        _count: { select: { reconciliations: true } },
        positions: {
          where: { isActive: true },
          select: { id: true, name: true, accountId: true, positionType: true, marketValue: true },
        },
      },
    });

    return { fullItem, openingBalanceJEId };
  });

  return successResponse({ ...serialize(item.fullItem), openingBalanceJEId: item.openingBalanceJEId }, 201);
}
