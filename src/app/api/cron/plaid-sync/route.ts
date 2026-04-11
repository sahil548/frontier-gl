import { prisma } from "@/lib/db/prisma";
import { syncTransactions } from "@/lib/plaid/sync";

/**
 * GET /api/cron/plaid-sync
 *
 * Daily cron job for syncing all active Plaid connections.
 * Vercel Cron triggers at 5AM UTC.
 * Protected by CRON_SECRET bearer token.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.plaidConnection.findMany({
    where: { status: "ACTIVE" },
  });

  let synced = 0;
  let errors = 0;
  const results: Array<{
    connectionId: string;
    subledgerItemId: string;
    status: "ok" | "error";
    added?: number;
    modified?: number;
    removed?: number;
    error?: string;
  }> = [];

  // Process sequentially to respect Plaid rate limits
  for (const connection of connections) {
    try {
      const result = await syncTransactions(connection);
      synced++;
      results.push({
        connectionId: connection.id,
        subledgerItemId: connection.subledgerItemId,
        status: "ok",
        ...result,
      });
    } catch (error) {
      errors++;
      const message =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        connectionId: connection.id,
        subledgerItemId: connection.subledgerItemId,
        status: "error",
        error: message,
      });

      // Update connection status to ERROR
      try {
        await prisma.plaidConnection.update({
          where: { id: connection.id },
          data: {
            status: "ERROR",
            error: message,
          },
        });
      } catch {
        // Ignore secondary error
      }
    }
  }

  return Response.json({ synced, errors, results });
}
