import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

const VALID_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"] as const;

interface CsvRow {
  number: string;
  name: string;
  type: string;
  description?: string;
  parentNumber?: string;
}

function parseCsvText(text: string): CsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0]
    .toLowerCase()
    .split(",")
    .map((h) => h.trim().replace(/"/g, ""));

  const numberIdx = headers.findIndex((h) => h === "number");
  const nameIdx = headers.findIndex((h) => h === "name");
  const typeIdx = headers.findIndex((h) => h === "type");
  const descIdx = headers.findIndex(
    (h) => h === "description" || h === "desc"
  );
  const parentIdx = headers.findIndex(
    (h) =>
      h === "parentnumber" ||
      h === "parent_number" ||
      h === "parent number" ||
      h === "parent"
  );

  if (numberIdx === -1 || nameIdx === -1 || typeIdx === -1) {
    return [];
  }

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

    rows.push({
      number: cols[numberIdx] || "",
      name: cols[nameIdx] || "",
      type: cols[typeIdx]?.toUpperCase() || "",
      description: descIdx !== -1 ? cols[descIdx] || undefined : undefined,
      parentNumber: parentIdx !== -1 ? cols[parentIdx] || undefined : undefined,
    });
  }

  return rows;
}

/**
 * POST /api/entities/:entityId/accounts/import
 *
 * Accepts CSV text in request body: { csv: "..." }
 * Expected columns: number, name, type, description (optional), parentNumber (optional)
 *
 * - Validates required fields and account type
 * - Skips rows where account number already exists
 * - Resolves parentNumber to parent account ID
 * - Creates accounts in a transaction (parents first)
 * - Creates AccountBalance for each new account
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  const { entityId } = await params;

  // Verify entity ownership
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!user) return errorResponse("Unauthorized", 401);

  const entity = await prisma.entity.findFirst({
    where: { id: entityId, createdById: user.id, isActive: true },
  });
  if (!entity) return errorResponse("Entity not found", 404);

  let body: { csv: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.csv || typeof body.csv !== "string") {
    return errorResponse("Missing csv field", 400);
  }

  const rows = parseCsvText(body.csv);
  if (rows.length === 0) {
    return errorResponse(
      "No valid rows found. Required columns: number, name, type",
      400
    );
  }

  // Validate rows
  const errors: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.number) {
      errors.push(`Row ${i + 2}: missing account number`);
    }
    if (!row.name) {
      errors.push(`Row ${i + 2}: missing account name`);
    }
    if (!VALID_TYPES.includes(row.type as (typeof VALID_TYPES)[number])) {
      errors.push(
        `Row ${i + 2}: invalid type "${row.type}" (must be ASSET, LIABILITY, EQUITY, INCOME, or EXPENSE)`
      );
    }
  }

  if (errors.length > 0) {
    return errorResponse(
      `CSV validation failed:\n${errors.slice(0, 20).join("\n")}${errors.length > 20 ? `\n...and ${errors.length - 20} more` : ""}`,
      400
    );
  }

  // Find existing account numbers in this entity
  const existingAccounts = await prisma.account.findMany({
    where: { entityId, isActive: true },
    select: { id: true, number: true },
  });
  const existingNumberSet = new Set(existingAccounts.map((a) => a.number));
  const existingNumberToId = new Map(
    existingAccounts.map((a) => [a.number, a.id])
  );

  // Separate rows into skipped (already exist) and to-create
  const toCreate: CsvRow[] = [];
  let skipped = 0;

  for (const row of rows) {
    if (existingNumberSet.has(row.number)) {
      skipped++;
    } else {
      toCreate.push(row);
    }
  }

  if (toCreate.length === 0) {
    return successResponse({ created: 0, skipped });
  }

  // Sort: accounts without parentNumber first, then those with parentNumber
  toCreate.sort((a, b) => {
    const aHasParent = a.parentNumber ? 1 : 0;
    const bHasParent = b.parentNumber ? 1 : 0;
    return aHasParent - bHasParent;
  });

  // Create accounts in a transaction
  const result = await prisma.$transaction(async (tx) => {
    let createdCount = 0;
    // Track newly created accounts so child rows can reference parents created in the same batch
    const newNumberToId = new Map<string, string>();

    for (const row of toCreate) {
      let parentId: string | null = null;

      if (row.parentNumber) {
        // Check existing accounts first, then newly created ones
        parentId =
          existingNumberToId.get(row.parentNumber) ||
          newNumberToId.get(row.parentNumber) ||
          null;

        if (!parentId) {
          // Parent not found -- skip this row
          skipped++;
          continue;
        }
      }

      const account = await tx.account.create({
        data: {
          entityId,
          number: row.number,
          name: row.name,
          type: row.type as (typeof VALID_TYPES)[number],
          description: row.description || null,
          parentId,
        },
      });

      await tx.accountBalance.create({
        data: {
          accountId: account.id,
          debitTotal: 0,
          creditTotal: 0,
          balance: 0,
        },
      });

      newNumberToId.set(row.number, account.id);
      createdCount++;
    }

    return createdCount;
  });

  return successResponse({ created: result, skipped }, 201);
}
