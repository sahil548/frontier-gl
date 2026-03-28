import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { createAccountSchema } from "@/lib/validators/account";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { serializeDecimal } from "@/lib/utils/serialization";
import Decimal from "decimal.js";

/**
 * Find the internal user and verify entity ownership.
 * Returns the entity or null if not found / not owned.
 */
async function findOwnedEntity(entityId: string, clerkUserId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (!user) return null;

  return prisma.entity.findFirst({
    where: { id: entityId, createdById: user.id, isActive: true },
  });
}

/**
 * Get all entity IDs for a user (for "all" entity scope).
 */
async function getUserEntityIds(clerkUserId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });
  if (!user) return [];

  const entities = await prisma.entity.findMany({
    where: { createdById: user.id, isActive: true },
    select: { id: true },
  });
  return entities.map((e) => e.id);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function aggregateBalance(node: any): Decimal {
  let total = new Decimal(0);
  if (node.balance) {
    total = total.plus(new Decimal(node.balance.balance.toString()));
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      total = total.plus(aggregateBalance(child));
    }
  }
  return total;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeAccount(account: any) {
  const displayBalance = aggregateBalance(account).toString();

  return {
    id: account.id,
    entityId: account.entityId,
    number: account.number,
    name: account.name,
    type: account.type,
    description: account.description,
    parentId: account.parentId,
    isActive: account.isActive,
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
 * GET /api/entities/:entityId/accounts
 *
 * Returns a flat array of accounts with balances for the entity.
 * For "all" entityId, returns accounts across all user's entities.
 * Client handles indentation based on parentId.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  let entityIds: string[];
  if (entityId === "all") {
    entityIds = await getUserEntityIds(userId);
  } else {
    const entity = await findOwnedEntity(entityId, userId);
    if (!entity) {
      return errorResponse("Entity not found", 404);
    }
    entityIds = [entityId];
  }

  const accounts = await prisma.account.findMany({
    where: {
      entityId: { in: entityIds },
      isActive: true,
    },
    include: {
      balance: true,
      children: {
        where: { isActive: true },
        include: {
          balance: true,
          children: {
            where: { isActive: true },
            include: {
              balance: true,
              children: {
                where: { isActive: true },
                include: { balance: true },
              },
            },
          },
        },
      },
    },
    orderBy: { number: "asc" },
  });

  return successResponse(accounts.map(serializeAccount));
}

/**
 * POST /api/entities/:entityId/accounts
 *
 * Creates a new account with hierarchy validation (2-level max).
 * Creates an empty AccountBalance row for the new account.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
  const entity = await findOwnedEntity(entityId, userId);
  if (!entity) {
    return errorResponse("Entity not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = createAccountSchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { name, number, type, description, parentId } = result.data;

  // Hierarchy validation
  if (parentId) {
    const parent = await prisma.account.findFirst({
      where: { id: parentId, entityId },
    });

    if (!parent) {
      return errorResponse("Parent account not found", 400);
    }

    // Enforce max 4-level hierarchy depth
    let depth = 1;
    let ancestor = parent;
    while (ancestor.parentId) {
      depth++;
      if (depth >= 4) break;
      const next = await prisma.account.findUnique({
        where: { id: ancestor.parentId },
      });
      if (!next) break;
      ancestor = next;
    }
    if (depth >= 4) {
      return errorResponse(
        "Maximum hierarchy depth is 4 levels.",
        400
      );
    }

    // Sub-account type must match parent type
    if (parent.type !== type) {
      return errorResponse(
        `Sub-account type must match parent type (${parent.type})`,
        400
      );
    }
  }

  // Check for duplicate account number within entity
  const existing = await prisma.account.findUnique({
    where: { entityId_number: { entityId, number } },
  });
  if (existing) {
    return errorResponse(
      `Account number ${number} already exists for this entity`,
      400
    );
  }

  // Create account and empty balance in a transaction
  const account = await prisma.$transaction(async (tx) => {
    const created = await tx.account.create({
      data: {
        entityId,
        name,
        number,
        type,
        description,
        parentId,
      },
    });

    await tx.accountBalance.create({
      data: {
        accountId: created.id,
        debitTotal: 0,
        creditTotal: 0,
        balance: 0,
      },
    });

    return tx.account.findUnique({
      where: { id: created.id },
      include: { balance: true, children: { where: { isActive: true }, include: { balance: true } } },
    });
  });

  if (!account) {
    return errorResponse("Failed to create account", 500);
  }

  return successResponse(serializeAccount(account), 201);
}
