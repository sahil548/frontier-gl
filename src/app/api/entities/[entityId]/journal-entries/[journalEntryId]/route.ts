import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { journalEntrySchema } from "@/lib/validators/journal-entry";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { Prisma } from "@/generated/prisma/client";

/**
 * Single journal entry API routes.
 *
 * GET    /api/entities/:entityId/journal-entries/:journalEntryId — Read with line items + audit
 * PUT    /api/entities/:entityId/journal-entries/:journalEntryId — Edit (DRAFT only)
 * DELETE /api/entities/:entityId/journal-entries/:journalEntryId — Delete (DRAFT only)
 */

// ─── Serialization ──────────────────────────────────────

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
    auditEntries?: Array<{
      id: string;
      action: string;
      userId: string;
      changes: unknown;
      createdAt: Date;
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
    auditEntries: entry.auditEntries?.map((a) => ({
      id: a.id,
      action: a.action,
      userId: a.userId,
      changes: a.changes,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

// ─── GET: Read single journal entry ──────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, journalEntryId } = await params;

  const je = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
    include: {
      lineItems: {
        include: {
          account: { select: { id: true, number: true, name: true, type: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      auditEntries: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!je) {
    return errorResponse("Journal entry not found", 404);
  }

  return successResponse(serializeJournalEntry(je as unknown as Record<string, unknown>));
}

// ─── PUT: Update journal entry (DRAFT only) ──────────────

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, journalEntryId } = await params;

  // Verify the entry exists and belongs to entity
  const existing = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
    include: {
      lineItems: {
        include: {
          account: { select: { id: true, number: true, name: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!existing) {
    return errorResponse("Journal entry not found", 404);
  }

  if (existing.status === "POSTED") {
    return errorResponse(
      "Posted entries are immutable. Use a reversing entry instead.",
      400
    );
  }

  if (existing.status !== "DRAFT") {
    return errorResponse("Cannot modify non-draft entries", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const result = journalEntrySchema.safeParse(body);
  if (!result.success) {
    return errorResponse("Validation failed", 400, result.error);
  }

  const { date, description, lineItems } = result.data;

  // Validate all accountIds exist and belong to entity
  const accountIds = lineItems.map((li) => li.accountId);
  const accounts = await prisma.account.findMany({
    where: {
      id: { in: accountIds },
      entityId,
      isActive: true,
    },
    select: { id: true, children: { select: { id: true }, take: 1 } },
  });

  if (accounts.length !== accountIds.length) {
    return errorResponse(
      "One or more account IDs are invalid or do not belong to this entity",
      400
    );
  }

  // Reject parent accounts
  const parentAccounts = accounts.filter((a) => a.children.length > 0);
  if (parentAccounts.length > 0) {
    return errorResponse(
      "Cannot post to parent accounts. Use sub-accounts instead.",
      400
    );
  }

  // Build changes diff for audit trail with field-level detail
  const changes: Record<string, { old: string; new: string }> = {};

  const existingDateStr = existing.date.toISOString().split("T")[0];
  const newDateStr = new Date(date).toISOString().split("T")[0];
  if (existingDateStr !== newDateStr) {
    changes.date = { old: existingDateStr, new: newDateStr };
  }
  if (existing.description !== description) {
    changes.description = { old: existing.description, new: description };
  }

  // Detailed line item diffs
  const oldLines = existing.lineItems;
  const maxLines = Math.max(oldLines.length, lineItems.length);
  let linesChanged = false;
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = lineItems[i];
    if (!oldLine && newLine) {
      changes[`Line ${i + 1} (added)`] = {
        old: "(none)",
        new: `debit ${newLine.debit || "0"} / credit ${newLine.credit || "0"}`,
      };
      linesChanged = true;
    } else if (oldLine && !newLine) {
      const acctLabel = oldLine.account ? `${oldLine.account.number} ${oldLine.account.name}` : oldLine.accountId;
      changes[`Line ${i + 1} (removed)`] = {
        old: `${acctLabel} debit ${oldLine.debit} / credit ${oldLine.credit}`,
        new: "(removed)",
      };
      linesChanged = true;
    } else if (oldLine && newLine) {
      const oldAcctLabel = oldLine.account ? `${oldLine.account.number} ${oldLine.account.name}` : oldLine.accountId;
      const oldDebit = String(oldLine.debit);
      const oldCredit = String(oldLine.credit);
      const newDebit = newLine.debit || "0";
      const newCredit = newLine.credit || "0";

      if (oldLine.accountId !== newLine.accountId) {
        changes[`Line ${i + 1} account`] = { old: oldAcctLabel, new: newLine.accountId };
        linesChanged = true;
      }
      if (oldDebit !== newDebit) {
        changes[`Line ${i + 1} debit`] = { old: oldDebit, new: newDebit };
        linesChanged = true;
      }
      if (oldCredit !== newCredit) {
        changes[`Line ${i + 1} credit`] = { old: oldCredit, new: newCredit };
        linesChanged = true;
      }
      if ((oldLine.memo || "") !== (newLine.memo || "")) {
        changes[`Line ${i + 1} memo`] = { old: oldLine.memo || "", new: newLine.memo || "" };
        linesChanged = true;
      }
    }
  }
  // Fallback if line count changed but no per-field diff captured
  if (!linesChanged && oldLines.length !== lineItems.length) {
    changes.lineItems = {
      old: oldLines.length + " lines",
      new: lineItems.length + " lines",
    };
  }

  // Update within transaction: replace header + all line items
  const updated = await prisma.$transaction(async (tx) => {
    // Delete old line items
    await tx.journalEntryLine.deleteMany({
      where: { journalEntryId },
    });

    // Update header and create new line items
    const je = await tx.journalEntry.update({
      where: { id: journalEntryId },
      data: {
        date: new Date(date),
        description,
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
        auditEntries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Create audit entry
    await tx.journalEntryAudit.create({
      data: {
        journalEntryId,
        action: "EDITED",
        userId,
        changes,
      },
    });

    return je;
  });

  return successResponse(serializeJournalEntry(updated as unknown as Record<string, unknown>));
}

// ─── DELETE: Delete journal entry (DRAFT only) ───────────

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entityId: string; journalEntryId: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse("Unauthorized", 401);
  }

  const { entityId, journalEntryId } = await params;

  const existing = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, entityId },
  });

  if (!existing) {
    return errorResponse("Journal entry not found", 404);
  }

  if (existing.status === "POSTED") {
    return errorResponse(
      "Posted entries are immutable. Use a reversing entry instead.",
      400
    );
  }

  if (existing.status !== "DRAFT") {
    return errorResponse("Cannot delete non-draft entries", 400);
  }

  await prisma.$transaction(async (tx) => {
    // Delete audit entries first (FK constraint)
    await tx.journalEntryAudit.deleteMany({
      where: { journalEntryId },
    });

    // Delete JE (lineItems cascade-deleted via onDelete: Cascade)
    await tx.journalEntry.delete({
      where: { id: journalEntryId },
    });
  });

  return successResponse({ deleted: true });
}
