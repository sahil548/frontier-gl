// import handler from "@/app/api/...";
import { describe, test } from "vitest";

describe("POST /api/budgets/rate — rate-based budget creation", () => {
  test.todo("POST creates budget lines from holding value and rate");
  test.todo("budget amounts are fixed at creation, not recalculated");
  test.todo("rejects invalid rate values (negative, > 1)");
});
