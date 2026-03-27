import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import {
  getLedgerTransactions,
  getAccountSummary,
} from "@/lib/queries/ledger-queries";
import { startOfMonth } from "date-fns";

/**
 * GL Ledger API route.
 *
 * GET /api/entities/:entityId/ledger/:accountId
 *   Returns ledger transactions with running balance, account details, and summary.
 */

const querySchema = z.object({
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((s) => new Date(s)),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().date())
    .transform((s) => new Date(s)),
  memoSearch: z.string().optional(),
  minAmount: z
    .string()
    .transform((s) => parseFloat(s))
    .pipe(z.number().finite())
    .optional(),
  maxAmount: z
    .string()
    .transform((s) => parseFloat(s))
    .pipe(z.number().finite())
    .optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string; accountId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, accountId } = await params;
  const url = new URL(request.url);

  // Build query params with defaults
  const rawParams: Record<string, string | undefined> = {
    startDate:
      url.searchParams.get("startDate") ??
      startOfMonth(new Date()).toISOString(),
    endDate:
      url.searchParams.get("endDate") ?? new Date().toISOString(),
    memoSearch: url.searchParams.get("memoSearch") ?? undefined,
    minAmount: url.searchParams.get("minAmount") ?? undefined,
    maxAmount: url.searchParams.get("maxAmount") ?? undefined,
  };

  // Remove undefined keys
  const cleanParams = Object.fromEntries(
    Object.entries(rawParams).filter(([, v]) => v !== undefined)
  );

  const parsed = querySchema.safeParse(cleanParams);
  if (!parsed.success) {
    return errorResponse("Invalid query parameters", 400, parsed.error);
  }

  // Verify account exists and belongs to entity
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      name: true,
      number: true,
      type: true,
      entityId: true,
    },
  });

  if (!account || account.entityId !== entityId) {
    return errorResponse("Account not found", 404);
  }

  const [ledgerResult, summary] = await Promise.all([
    getLedgerTransactions(entityId, accountId, {
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      memoSearch: parsed.data.memoSearch,
      minAmount: parsed.data.minAmount,
      maxAmount: parsed.data.maxAmount,
    }),
    getAccountSummary(entityId, accountId),
  ]);

  return successResponse({
    account: {
      id: account.id,
      name: account.name,
      accountNumber: account.number,
      type: account.type,
    },
    summary,
    beginningBalance: ledgerResult.beginningBalance,
    transactions: ledgerResult.transactions.map((t) => ({
      ...t,
      date: t.date instanceof Date ? t.date.toISOString() : t.date,
    })),
  });
}
