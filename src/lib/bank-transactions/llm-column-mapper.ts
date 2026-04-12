import Anthropic from "@anthropic-ai/sdk";

/**
 * Valid column roles per import type.
 */
const ROLES_BY_TYPE: Record<string, string[]> = {
  bank: ["date", "description", "amount", "debit", "credit", "reference"],
  coa: ["accountNumber", "accountName", "accountType", "description", "parentNumber"],
  budget: ["accountNumber", "month", "year", "amount"],
};

/**
 * Uses the Anthropic API to infer column mappings from CSV headers and sample rows.
 *
 * Returns a mapping object (role -> header string), or null if:
 * - ANTHROPIC_API_KEY is not set
 * - The API call fails or times out
 * - The response cannot be parsed as valid JSON
 *
 * @param headers - Array of CSV header strings
 * @param sampleRows - First few rows of CSV data
 * @param importType - "bank" | "coa" | "budget"
 * @returns Mapping object or null
 */
export async function inferColumnMapping(
  headers: string[],
  sampleRows: string[][],
  importType: "bank" | "coa" | "budget"
): Promise<Record<string, string> | null> {
  // Graceful fallback: no API key means no LLM inference
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }

  const validRoles = ROLES_BY_TYPE[importType];
  if (!validRoles) return null;

  const prompt = [
    `You are a CSV column mapping assistant. Given the CSV headers and sample data rows below, determine which header corresponds to each role.`,
    ``,
    `Headers: ${JSON.stringify(headers)}`,
    ``,
    `Sample rows:`,
    ...sampleRows.slice(0, 3).map((row, i) => `Row ${i + 1}: ${JSON.stringify(row)}`),
    ``,
    `Valid roles for "${importType}" import: ${validRoles.join(", ")}`,
    ``,
    `Return ONLY a JSON object mapping role names to the exact header string. Only include roles where a matching column exists. Do not include explanation.`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const client = new Anthropic();
    const response = await client.messages.create(
      {
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    // Extract text from response
    const textBlock = response.content.find(
      (block: { type: string }) => block.type === "text"
    );
    if (!textBlock || textBlock.type !== "text") return null;

    // Strip markdown code fences if present
    let jsonText = (textBlock as { type: "text"; text: string }).text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const mapping = JSON.parse(jsonText);

    // Validate it's a plain object with string values
    if (typeof mapping !== "object" || mapping === null || Array.isArray(mapping)) {
      return null;
    }

    return mapping as Record<string, string>;
  } catch {
    // Any error (API timeout, network, parse) -> graceful null fallback
    return null;
  }
}
