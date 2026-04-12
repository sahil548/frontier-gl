import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { updateAccountSchema } from "@/lib/validators/account";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { serializeDecimal } from "@/lib/utils/serialization";
import Decimal from "decimal.js";
import { findAccessibleEntity } from "@/lib/db/entity-access";

/**
 * Serialize an account with balance for JSON transport.
 */
function serializeAccount(account: {
  id: string;
  entityId: string;
  number: string;
  name: string;
  type: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  cashFlowCategory?: string | null;
  isContra?: boolean;
  createdAt: Date;
  updatedAt: Date;
  balance?: { debitTotal: Decimal; creditTotal: Decimal; balance: Decimal } | null;
  children?: Array<{
    id: string;
    balance?: { debitTotal: Decimal; creditTotal: Decimal; balance: Decimal } | null;
  }>;
}) {
  let displayBalance: string;
  if (account.children && account.children.length > 0) {
    const aggregated = account.children.reduce(
      (sum, child) => {
        if (child.balance) {
          return sum.plus(new Decimal(child.balance.balance.toString()));
        }
        return sum;
      },
      new Decimal(0)
    );
    if (account.balance) {
      displayBalance = aggregated.plus(new Decimal(account.balance.balance.toString())).toString();
    } else {
      displayBalance = aggregated.toString();
    }
  } else {
    displayBalance = account.balance
      ? serializeDecimal(new Decimal(account.balance.balance.toString())) ?? "0"
      : "0";
  }

  return {
    id: account.id,
    entityId: account.entityId,
    number: account.number,
    name: account.name,
    type: account.type,
    description: account.description,
    parentId: account.parentId,
    isActive: account.isActive,
    cashFlowCategory: account.cashFlowCategory ?? null,
    isContra: account.isContra ?? false,
    balance: displayBalance,
    debitTotal: account.balance
      ? serializeDecimal(new Decimal(account.balance.debitTotal.toString()))
      : "0",
    creditTotal: account.balance
      ? serializeDecimal(new Decimal(account.balance.creditTotal.toString()))
      : "0",
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}

/**
 * GET /api/entities/:entityId/accounts/:accountId
 *
 * Returns a single account with balance and children.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; accountId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, accountId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, entityId },
    include: {
      balance: true,
      children: {
        where: { isActive: true },
        include: { balance: true },
      },
    },
  });

  if (!account) {
    return errorResponse("Account not found", 404);
  }

  return successResponse(serializeAccount(account));
}

/**
 * PUT /api/entities/:entityId/accounts/:accountId
 *
 * Updates account details. If isActive=false (deactivation),
 * verifies the account has no active children.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string; accountId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, accountId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = updateAccountSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, entityId },
    include: {
      children: { where: { isActive: true } },
    },
  });

  if (!account) {
    return errorResponse("Account not found", 404);
  }

  // Deactivation check: cannot deactivate if there are active children
  if (result.data.isActive === false && account.children.length > 0) {
    return errorResponse(
      "Cannot deactivate account with active sub-accounts. Deactivate sub-accounts first.",
      400
    );
  }

  // If updating number, check for uniqueness
  if (result.data.number && result.data.number !== account.number) {
    const existing = await prisma.account.findUnique({
      where: { entityId_number: { entityId, number: result.data.number } },
    });
    if (existing) {
      return errorResponse(
        `Account number ${result.data.number} already exists for this entity`,
        400
      );
    }
  }

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: result.data,
    include: {
      balance: true,
      children: {
        where: { isActive: true },
        include: { balance: true },
      },
    },
  });

  return successResponse(serializeAccount(updated));
}
