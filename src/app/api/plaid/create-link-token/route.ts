import { auth } from "@clerk/nextjs/server";
import { Products, CountryCode } from "plaid";
import { plaidClient } from "@/lib/plaid/client";
import { prisma } from "@/lib/db/prisma";
import { decryptToken } from "@/lib/plaid/encrypt";
import { successResponse, errorResponse } from "@/lib/validators/api-response";

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

  // Check for existing ERROR connection (update mode)
  const existingConnection = await prisma.plaidConnection.findUnique({
    where: { subledgerItemId: body.subledgerItemId },
  });

  const isUpdateMode =
    existingConnection && existingConnection.status === "ERROR";

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Frontier GL",
      products: isUpdateMode ? undefined : [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      ...(isUpdateMode
        ? {
            access_token: decryptToken(existingConnection.accessToken),
          }
        : {}),
    });

    return successResponse({ linkToken: response.data.link_token });
  } catch (error) {
    console.error("Plaid linkTokenCreate error:", error);
    return errorResponse("Failed to create link token", 500);
  }
}
