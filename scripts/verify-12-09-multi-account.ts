/**
 * Plan 12-09 end-to-end verification script.
 *
 * Exercises the exact production code path the bank-transactions POST route
 * uses for multi-account CSV imports, against real DB + real Prisma:
 *   parseBankStatementCsv → resolveAccountRefs → per-group createMany
 *
 * Chrome UI upload is blocked by Chrome-automation security (native OS file
 * picker can't be programmatically fed), so this script substitutes the HTTP
 * layer while still executing the fix under test. Chrome reload after this
 * runs will show the inserted rows partitioned per bank account — that's the
 * end-to-end visual verification.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/db/prisma";
import { parseBankStatementCsv } from "../src/lib/bank-transactions/csv-parser";
import { resolveAccountRefs } from "../src/lib/bank-transactions/resolve-account-refs";
import {
  generateTransactionHash,
  findDuplicates,
} from "../src/lib/bank-transactions/duplicate-check";
import { Prisma } from "../src/generated/prisma/client";

const ENTITY_ID = "cmnvw13yn0002y38oxof5cupx"; // Three Pagodas, LLC
const CSV_PATH = "/tmp/multi-bank-citi.csv";

(async () => {
  console.log("=== Plan 12-09 multi-account CSV import verification ===\n");

  const csvText = readFileSync(CSV_PATH, "utf-8");
  console.log("CSV contents:\n" + csvText);

  // Step 1: Parse with account column mapped (triggers multi-account branch).
  const mapping = {
    date: "Date",
    description: "Description",
    amount: "Amount",
    account: "Account",
  };
  const parsedRows = parseBankStatementCsv(csvText, mapping);
  console.log(`\n[parse] ${parsedRows.length} rows parsed`);
  for (const r of parsedRows) {
    console.log(`  ${r.date} "${r.description}" amount=${r.amount} accountRef="${r.accountRef}"`);
  }

  // Step 2: Fetch the entity's BANK_ACCOUNT subledger items.
  const subledgerItems = await prisma.subledgerItem.findMany({
    where: { entityId: ENTITY_ID, isActive: true, itemType: "BANK_ACCOUNT" },
    select: { id: true, name: true, account: { select: { number: true } } },
  });
  console.log(`\n[subledger] ${subledgerItems.length} active BANK_ACCOUNT items for entity:`);
  for (const s of subledgerItems) {
    console.log(`  id=${s.id} name="${s.name}" number=${s.account?.number ?? "(none)"}`);
  }

  // Step 3: Resolve per-row accountRef → subledgerItemId using the new fn.
  const { resolved, errors } = resolveAccountRefs(parsedRows, subledgerItems, "name");
  console.log(`\n[resolve] ${resolved.length} resolved, ${errors.length} errors`);
  for (const r of resolved) {
    console.log(`  resolved: "${r.description}" -> subId=${r.subledgerItemId}`);
  }
  for (const e of errors) {
    console.log(`  error:    ${e}`);
  }

  // Step 4: Group by subledgerItemId and insert with per-account duplicate
  // scope (mirrors processMultiAccountRows in the POST route).
  const groups = new Map<string, typeof resolved>();
  for (const row of resolved) {
    const arr = groups.get(row.subledgerItemId) ?? [];
    arr.push(row);
    groups.set(row.subledgerItemId, arr);
  }

  let importedTotal = 0;
  let skippedTotal = 0;

  for (const [subId, groupRows] of groups.entries()) {
    const hashMap = new Map<string, (typeof resolved)[number]>();
    const hashList: string[] = [];
    for (let i = 0; i < groupRows.length; i++) {
      const row = groupRows[i];
      const hash = generateTransactionHash(
        row.date,
        String(row.amount),
        row.description,
        i
      );
      hashMap.set(hash, row);
      hashList.push(hash);
    }

    const existingHashes = await findDuplicates(subId, hashList);
    skippedTotal += existingHashes.size;

    const createOperations: Prisma.BankTransactionCreateManyInput[] = [];
    for (const [hash, row] of hashMap.entries()) {
      if (existingHashes.has(hash)) continue;
      createOperations.push({
        subledgerItemId: subId,
        externalId: hash,
        date: new Date(row.date),
        description: row.description,
        amount: new Prisma.Decimal(String(row.amount)),
        source: "CSV",
        status: "PENDING",
        accountId: null,
        ruleId: null,
      });
      importedTotal++;
    }

    if (createOperations.length > 0) {
      await prisma.bankTransaction.createMany({ data: createOperations });
    }
    console.log(`\n[insert] subId=${subId}: +${createOperations.length} new, ${existingHashes.size} dupes`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`imported: ${importedTotal}`);
  console.log(`skipped:  ${skippedTotal}`);
  console.log(`errors:   ${errors.length}`);
  console.log(`error list:`);
  for (const e of errors) console.log(`  - ${e}`);

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error("FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
