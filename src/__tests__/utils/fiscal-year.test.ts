import { describe, it, expect } from "vitest";
// import { getFiscalYearMonths, getFiscalYearDateRange } from "@/lib/utils/fiscal-year";

describe("getFiscalYearMonths", () => {
  it.todo("returns Jan-Dec for FYE 12-31, fiscal year 2025");
  it.todo("returns Apr 2024 - Mar 2025 for FYE 03-31, fiscal year 2025");
  it.todo("returns Jul 2024 - Jun 2025 for FYE 06-30, fiscal year 2025");
  it.todo("returns 12 months for any valid FYE");
  it.todo("labels use short month names (Jan, Feb, Mar, etc.)");
});

describe("getFiscalYearDateRange", () => {
  it.todo("returns Jan 1 - Dec 31 for FYE 12-31, fiscal year 2025");
  it.todo("returns Apr 1 2024 - Mar 31 2025 for FYE 03-31, fiscal year 2025");
});
