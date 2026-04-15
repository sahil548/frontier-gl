/**
 * Cleanup helper: deletes the verification test transactions inserted by
 * scripts/verify-12-09-multi-account.ts. Matches on description prefix
 * "Test-" scoped to Three Pagodas' two Citibank bank-account subledger items
 * so we don't touch any real data.
 */
import { prisma } from "../src/lib/db/prisma";

const CITIBANK_CHECKING_SUB_ID = "cmnvzu5st0002e98o5qnwnf8c";
const CITIBANK_SAVINGS_SUB_ID = "cmnvzu63a0005e98ohfglxu9t";

(async () => {
  const before = await prisma.bankTransaction.findMany({
    where: {
      subledgerItemId: { in: [CITIBANK_CHECKING_SUB_ID, CITIBANK_SAVINGS_SUB_ID] },
      description: { startsWith: "Test-" },
    },
    select: { id: true, description: true, subledgerItemId: true, amount: true },
  });
  console.log(`Found ${before.length} test transactions to delete:`);
  for (const t of before) {
    console.log(`  id=${t.id} "${t.description}" amount=${t.amount} sub=${t.subledgerItemId}`);
  }

  const result = await prisma.bankTransaction.deleteMany({
    where: {
      subledgerItemId: { in: [CITIBANK_CHECKING_SUB_ID, CITIBANK_SAVINGS_SUB_ID] },
      description: { startsWith: "Test-" },
    },
  });
  console.log(`\nDeleted: ${result.count}`);

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error("FAILED:", err);
  await prisma.$disconnect();
  process.exit(1);
});
