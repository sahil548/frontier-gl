import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  return {
    default: function Anthropic() {
      return { messages: { create: mockCreate } };
    },
  };
});

import { inferColumnMapping } from "@/lib/bank-transactions/llm-column-mapper";

describe("inferColumnMapping", () => {
  const bankHeaders = ["Date", "Description", "Amount", "Reference"];
  const sampleRows = [
    ["2024-01-15", "Grocery Store", "125.50", "CHK-001"],
    ["2024-01-16", "Gas Station", "45.00", "CHK-002"],
  ];

  let originalKey: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalKey = process.env.ANTHROPIC_API_KEY;
  });

  afterEach(() => {
    if (originalKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("returns null when ANTHROPIC_API_KEY is not set", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns valid column mapping for standard bank CSV headers", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            date: "Date",
            description: "Description",
            amount: "Amount",
            reference: "Reference",
          }),
        },
      ],
    });

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toEqual({
      date: "Date",
      description: "Description",
      amount: "Amount",
      reference: "Reference",
    });
  });

  it("handles LLM response wrapped in markdown code fences", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: '```json\n{"date": "Date", "description": "Description", "amount": "Amount"}\n```',
        },
      ],
    });

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toEqual({
      date: "Date",
      description: "Description",
      amount: "Amount",
    });
  });

  it("returns null on API error (does not throw)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockCreate.mockRejectedValueOnce(new Error("API timeout"));

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toBeNull();
  });

  it("returns null when LLM returns invalid JSON", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "This is not valid JSON at all" }],
    });

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toBeNull();
  });

  it("returns mapping for COA import type", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const coaHeaders = ["Acct No", "Name", "Category", "Desc"];
    const coaRows = [["1000", "Cash", "ASSET", "Cash in bank"]];

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            accountNumber: "Acct No",
            accountName: "Name",
            accountType: "Category",
            description: "Desc",
          }),
        },
      ],
    });

    const result = await inferColumnMapping(coaHeaders, coaRows, "coa");
    expect(result).toEqual({
      accountNumber: "Acct No",
      accountName: "Name",
      accountType: "Category",
      description: "Desc",
    });
    // Verify the prompt mentions COA roles
    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs.messages[0].content).toContain("accountNumber");
  });

  it("returns mapping for budget import type", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    const budgetHeaders = ["Account", "Month", "Year", "Budget Amount"];
    const budgetRows = [["4000", "1", "2025", "5000.00"]];

    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            accountNumber: "Account",
            month: "Month",
            year: "Year",
            amount: "Budget Amount",
          }),
        },
      ],
    });

    const result = await inferColumnMapping(budgetHeaders, budgetRows, "budget");
    expect(result).toEqual({
      accountNumber: "Account",
      month: "Month",
      year: "Year",
      amount: "Budget Amount",
    });
  });

  it("handles empty content array from LLM response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";

    mockCreate.mockResolvedValueOnce({
      content: [],
    });

    const result = await inferColumnMapping(bankHeaders, sampleRows, "bank");
    expect(result).toBeNull();
  });
});
