import { auth } from "@clerk/nextjs/server";
import { plaidClient } from "@/lib/plaid/client";
import { prisma } from "@/lib/db/prisma";
import { encryptToken } from "@/lib/plaid/encrypt";
import { syncTransactions } from "@/lib/plaid/sync";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Unauthorized", 401);

  let body: {
    publicToken: string;
    subledgerItemId: string;
    institutionId?: string;
    institutionName?: string;
    accountId?: string;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON", 400);
  }

  if (!body.publicToken || !body.subledgerItemId) {
    return errorResponse("publicToken and subledgerItemId are required", 400);
  }

  try {
    // Exchange public_token for access_token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: body.publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Encrypt access token before storage
    const encryptedToken = encryptToken(accessToken);

    // Upsert PlaidConnection (handles both new + reconnect flows)
    const connection = await prisma.plaidConnection.upsert({
      where: { subledgerItemId: body.subledgerItemId },
      create: {
        subledgerItemId: body.subledgerItemId,
        accessToken: encryptedToken,
        itemId,
        institutionId: body.institutionId ?? null,
        institutionName: body.institutionName ?? null,
        plaidAccountId: body.accountId ?? null,
        status: "ACTIVE",
      },
      update: {
        accessToken: encryptedToken,
        itemId,
        institutionId: body.institutionId ?? null,
        institutionName: body.institutionName ?? null,
        plaidAccountId: body.accountId ?? null,
        status: "ACTIVE",
        error: null,
        syncCursor: null,
      },
    });

    // Trigger initial sync immediately
    const result = await syncTransactions(connection);

    return successResponse({
      success: true,
      transactionsSynced: result.added,
    });
  } catch (error) {
    console.error("Plaid exchange-token error:", error);
    return errorResponse("Failed to exchange token", 500);
  }
}
