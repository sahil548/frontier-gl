import { auth } from "@clerk/nextjs/server";
import { findAccessibleEntity } from "@/lib/db/entity-access";
import { successResponse, errorResponse } from "@/lib/validators/api-response";
import { inferColumnMapping } from "@/lib/bank-transactions/llm-column-mapper";
import {
  getSavedMapping,
  findMappingByHeaders,
} from "@/lib/bank-transactions/column-mapping-store";
import { z } from "zod";

/**
 * Heuristic column patterns matching (extracted from csv-parser.ts for reuse).
 */
const COLUMN_PATTERNS: Record<string, Record<string, string[]>> = {
  bank: {
    date: ["date", "posted date", "trans date", "transaction date", "posting date"],
    description: ["description", "memo", "details", "transaction description", "narrative", "payee"],
    amount: ["amount", "transaction amount", "net amount"],
    debit: ["debit", "debit amount", "withdrawal", "withdrawals"],
    credit: ["credit", "credit amount", "deposit", "deposits"],
    reference: ["reference", "ref", "check number", "check #", "confirmation"],
  },
  coa: {
    accountNumber: ["number", "account number", "acct no", "acct #", "account no", "code"],
    accountName: ["name", "account name", "account", "title", "label"],
    accountType: ["type", "account type", "category", "class"],
    description: ["description", "desc", "memo", "notes"],
    parentNumber: ["parent", "parent number", "parent no", "parent account"],
  },
  budget: {
    accountNumber: ["account", "account number", "acct", "acct no", "account no"],
    month: ["month", "period", "mon"],
    year: ["year", "yr", "fiscal year"],
    amount: ["amount", "budget", "budget amount", "target"],
  },
};

function heuristicDetect(
  headers: string[],
  importType: string
): Record<string, string> {
  const patterns = COLUMN_PATTERNS[importType];
  if (!patterns) return {};

  const normalized = headers.map((h) => h.trim().toLowerCase());
  const mapping: Record<string, string> = {};

  for (const [role, rolePatterns] of Object.entries(patterns)) {
    for (const pattern of rolePatterns) {
      const idx = normalized.indexOf(pattern);
      if (idx !== -1) {
        mapping[role] = headers[idx];
        break;
      }
    }
  }

  return mapping;
}

const requestSchema = z.object({
  headers: z.array(z.string()).min(1),
  sampleRows: z.array(z.array(z.string())),
  importType: z.enum(["bank", "coa", "budget"]),
  sourceName: z.string().optional(),
});

/**
 * POST /api/entities/:entityId/csv-column-map
 *
 * Infers column mappings for a CSV file. Tries in order:
 * 1. Saved mapping by sourceName (explicit match, if sourceName provided)
 * 2. Saved mapping by header fingerprint (fallback when sourceName absent)
 * 3. LLM inference
 * 4. Heuristic pattern matching
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Not authenticated", 401);

  const { entityId } = await params;
  const entity = await findAccessibleEntity(entityId, userId);
  if (!entity) return errorResponse("Entity not found", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Invalid request", 400);
  }

  const { headers, sampleRows, importType, sourceName } = parsed.data;

  // 1. Check saved mapping first (if sourceName provided)
  if (sourceName) {
    const saved = await getSavedMapping(entityId, sourceName, importType);
    if (saved) {
      return successResponse({ mapping: saved, source: "saved", sourceName });
    }
  }

  // 2. Header-fingerprint fallback: match an existing saved mapping by the
  //    set of headers when no explicit sourceName was supplied. Surfaces the
  //    original sourceName so the UI can pre-fill it and show the "Saved" badge.
  const fingerprintMatch = await findMappingByHeaders(
    entityId,
    importType,
    headers
  );
  if (fingerprintMatch) {
    return successResponse({
      mapping: fingerprintMatch.mapping,
      source: "saved",
      sourceName: fingerprintMatch.sourceName,
    });
  }

  // 3. Try LLM inference
  const llmMapping = await inferColumnMapping(headers, sampleRows, importType);
  if (llmMapping && Object.keys(llmMapping).length > 0) {
    return successResponse({ mapping: llmMapping, source: "llm" });
  }

  // 4. Fall back to heuristic pattern matching
  const heuristic = heuristicDetect(headers, importType);
  return successResponse({ mapping: heuristic, source: "heuristic" });
}
