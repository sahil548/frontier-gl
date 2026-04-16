import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { journalEntrySchema } from "@/lib/validators/journal-entry";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { generateNextEntryNumber } from "@/lib/journal-entries/auto-number";
import { postJournalEntryInTx } from "@/lib/journal-entries/post";
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
      dimensionTags?: Array<{
        id: string;
        dimensionTagId: string;
        dimensionTag?: {
          id: string;
          dimensionId: string;
          code: string;
          name: string;
          dimension?: { id: string; name: string };
        };
      }>;
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
    lineItems: entry.lineItems?.map((li) => {
      // Serialize dimension tags to { dimensionId: tagId } format for form consumption
      const dimensionTags: Record<string, string> = {};
      if (li.dimensionTags) {
        for (const dt of li.dimensionTags) {
          const dimId = dt.dimensionTag?.dimensionId ?? dt.dimensionTag?.dimension?.id;
          if (dimId) {
            dimensionTags[dimId] = dt.dimensionTagId;
          }
        }
      }
      return {
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
        dimensionTags,
      };
    }),
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
            dimensionTags: {
              include: {
                dimensionTag: {
                  include: { dimension: { select: { id: true, name: true } } },
                },
              },
            },
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

  // Phase 14: status field semantics
  // - undefined (omitted) → shouldPost = true (new default; auto-post when balanced)
  // - "POSTED" (explicit) → shouldPost = true
  // - "DRAFT" (explicit opt-out, e.g. manual JE form Save Draft) → shouldPost = false
  const status = result.data.status;
  const shouldPost = status !== "DRAFT";

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

  // Create journal entry within transaction (auto-number + create + audit + dimension tags)
  try {
    const entry = await prisma.$transaction(async (tx) => {
      const entryNumber = await generateNextEntryNumber(tx, entityId);

      // Step 1: Create JE with line items (no dimension tags yet)
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
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      // Step 2: Create dimension tag junction records
      const tagCreates: Array<{ journalEntryLineId: string; dimensionTagId: string }> = [];
      for (let i = 0; i < je.lineItems.length; i++) {
        const li = lineItems[i];
        const lineId = je.lineItems[i].id;
        if (li.dimensionTags) {
          for (const tagId of Object.values(li.dimensionTags)) {
            if (tagId) {
              tagCreates.push({ journalEntryLineId: lineId, dimensionTagId: tagId });
            }
          }
        }
      }
      if (tagCreates.length > 0) {
        await tx.journalEntryLineDimensionTag.createMany({ data: tagCreates });
      }

      // Step 3: Create audit trail (CREATED before any POSTED audit so the
      // audit ordering matches the standalone /post route: CREATED → POSTED).
      await tx.journalEntryAudit.create({
        data: {
          journalEntryId: je.id,
          action: "CREATED",
          userId,
        },
      });

      // Step 4 (Phase 14): auto-post when requested. Status flips from DRAFT
      // to POSTED, AccountBalance is upserted, POSTED audit is written —
      // all inside this same $transaction. Closed-period or "already posted"
      // errors thrown by postJournalEntryInTx propagate to the outer catch
      // and are mapped to 400 responses there.
      if (shouldPost) {
        await postJournalEntryInTx(tx, je.id, userId);
      }

      // Step 5: Re-fetch with full includes for response (status will reflect
      // POSTED when shouldPost was true).
      const full = await tx.journalEntry.findUniqueOrThrow({
        where: { id: je.id },
        include: {
          lineItems: {
            include: {
              account: { select: { id: true, number: true, name: true, type: true } },
              dimensionTags: {
                include: {
                  dimensionTag: {
                    include: { dimension: { select: { id: true, name: true } } },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      return full;
    });

    return successResponse(
      serializeJournalEntry(entry as unknown as Record<string, unknown>),
      201
    );
  } catch (err) {
    // Phase 14: map postJournalEntryInTx errors surfaced from auto-post path
    // to user-friendly 400s (mirrors standalone /post route behavior).
    const message = err instanceof Error ? err.message : "Failed to create journal entry";
    if (message.includes("already posted")) {
      return errorResponse("Journal entry is already posted", 400);
    }
    if (message.includes("closed period") || message.includes("period is closed")) {
      return errorResponse(
        "Cannot post to a closed period. Reopen the period first.",
        400
      );
    }
    console.error("JE create error:", err);
    return errorResponse("Failed to create journal entry", 500);
  }
}
