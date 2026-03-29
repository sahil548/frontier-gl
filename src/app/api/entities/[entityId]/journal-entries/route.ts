import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { journalEntrySchema } from "@/lib/validators/journal-entry";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { Prisma } from "@/generated/prisma/client";

/**
 * Journal entry list and create API routes.
 *
 * GET  /api/entities/:entityId/journal-entries  — List with status filter + pagination
 * POST /api/entities/:entityId/journal-entries  — Create draft JE with auto-number
 */

// ─── Serialization Helpers ───────────────────────────────

function serializeDecimal(val: Prisma.Decimal | null): string {
  if (val === null) return "0";
  return val.toString();
}

function serializeJournalEntry(je: Record<string, unknown>) {
  const entry = je as {
    id: string;
    entityId: string;
    entryNumber: string;
    date: Date;
    description: string;
    status: string;
    createdBy: string;
    approvedBy: string | null;
    postedBy: string | null;
    createdAt: Date;
    approvedAt: Date | null;
    postedAt: Date | null;
    updatedAt: Date;
    reversalOfId: string | null;
    templateId: string | null;
    lineItems?: Array<{
      id: string;
      journalEntryId: string;
      accountId: string;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      memo: string | null;
      sortOrder: number;
      account?: { id: string; number: string; name: string; type: string };
    }>;
  };

  return {
    id: entry.id,
    entityId: entry.entityId,
    entryNumber: entry.entryNumber,
    date: entry.date.toISOString(),
    description: entry.description,
    status: entry.status,
    createdBy: entry.createdBy,
    approvedBy: entry.approvedBy,
    postedBy: entry.postedBy,
    createdAt: entry.createdAt.toISOString(),
    approvedAt: entry.approvedAt?.toISOString() ?? null,
    postedAt: entry.postedAt?.toISOString() ?? null,
    updatedAt: entry.updatedAt.toISOString(),
    reversalOfId: entry.reversalOfId,
    templateId: entry.templateId ?? null,
    lineItems: entry.lineItems?.map((li) => ({
      id: li.id,
      journalEntryId: li.journalEntryId,
      accountId: li.accountId,
      debit: serializeDecimal(li.debit),
      credit: serializeDecimal(li.credit),
      memo: li.memo,
      sortOrder: li.sortOrder,
      account: li.account
        ? {
            id: li.account.id,
            number: li.account.number,
            name: li.account.name,
            type: li.account.type,
          }
        : undefined,
    })),
  };
}

// ─── GET: List journal entries ───────────────────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10))
  );
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.JournalEntryWhereInput = { entityId };
  if (status && ["DRAFT", "APPROVED", "POSTED"].includes(status)) {
    where.status = status as "DRAFT" | "APPROVED" | "POSTED";
  }

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      include: {
        lineItems: {
          include: {
            account: { select: { id: true, number: true, name: true, type: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ date: "desc" }, { entryNumber: "desc" }],
      skip,
      take: limit,
    }),
    prisma.journalEntry.count({ where }),
  ]);

  return successResponse({
    entries: entries.map((e) => serializeJournalEntry(e as unknown as Record<string, unknown>)),
    total,
    page,
    limit,
  });
}

// ─── POST: Create journal entry ──────────────────────────

export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // Validate with Zod schema (includes debit=credit balance check)
  const result = journalEntrySchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { date, description, lineItems } = result.data;

  // Validate all accountIds exist and belong to this entity
  const accountIds = lineItems.map((li) => li.accountId);
  const accounts = await prisma.account.findMany({
    where: {
      id: { in: accountIds },
      entityId,
      isActive: true,
    },
    select: { id: true, parentId: true, children: { select: { id: true }, take: 1 } },
  });

  if (accounts.length !== accountIds.length) {
    return errorResponse(
      "One or more account IDs are invalid or do not belong to this entity",
      400
    );
  }

  // Reject parent accounts (accounts that have children cannot have direct postings)
  const parentAccounts = accounts.filter((a) => a.children.length > 0);
  if (parentAccounts.length > 0) {
    return errorResponse(
      "Cannot post to parent accounts. Use sub-accounts instead.",
      400
    );
  }

  // Create journal entry within transaction (auto-number + create + audit)
  const entry = await prisma.$transaction(async (tx) => {
    const entryNumber = await generateNextEntryNumber(tx, entityId);

    const je = await tx.journalEntry.create({
      data: {
        entityId,
        entryNumber,
        date: new Date(date),
        description,
        status: "DRAFT",
        createdBy: userId,
        lineItems: {
          create: lineItems.map((li, index) => ({
            accountId: li.accountId,
            debit: new Prisma.Decimal(li.debit || "0"),
            credit: new Prisma.Decimal(li.credit || "0"),
            memo: li.memo || null,
            sortOrder: index,
          })),
        },
      },
      include: {
        lineItems: {
          include: {
            account: { select: { id: true, number: true, name: true, type: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Create audit trail
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId: je.id,
        action: "CREATED",
        userId,
      },
    });

    return je;
  });

  return successResponse(
    serializeJournalEntry(entry as unknown as Record<string, unknown>),
    201
  );
}
