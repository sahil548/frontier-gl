import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { syncTransactions } from "@/lib/plaid/sync";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

/**
 * POST /api/plaid/sync
 *
 * Manual "Sync Now" for an individual connection.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  let body: { subledgerItemId: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.subledgerItemId) {
    return errorResponse("subledgerItemId is required", 400);
  }

  const connection = await prisma.plaidConnection.findUnique({
    where: { subledgerItemId: body.subledgerItemId },
  });

  if (!connection) {
    return errorResponse("No Plaid connection found", 404);
  }

  if (connection.status !== "ACTIVE") {
    return errorResponse(
      `Connection is ${connection.status}. Reconnect first.`,
      400
    );
  }

  try {
    const result = await syncTransactions(connection);
    return successResponse(result);
  } catch (error) {
    console.error("Plaid manual sync error:", error);
    return errorResponse("Sync failed", 500);
  }
}
