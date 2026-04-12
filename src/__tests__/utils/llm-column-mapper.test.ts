// import { inferColumnMapping } from "@/lib/bank-transactions/llm-column-mapper";
import { describe, test } from "vitest";

describe("inferColumnMapping", () => {
  test.todo("returns valid column mapping for standard bank CSV headers");
  test.todo("returns valid mapping for non-standard headers via LLM");
  test.todo("falls back to null when LLM is unavailable");
  test.todo("handles empty headers array gracefully");
  test.todo("returns mapping for COA import type");
  test.todo("returns mapping for budget import type");
});
