import { describe, it, expect } from "vitest";
import { getFiscalYearMonths, getFiscalYearDateRange } from "@/lib/utils/fiscal-year";

describe("getFiscalYearMonths", () => {
  it("returns Jan-Dec for FYE 12-31, fiscal year 2025", () => {
    const months = getFiscalYearMonths("12-31", 2025);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2025, month: 1, label: "Jan" });
    expect(months[11]).toEqual({ year: 2025, month: 12, label: "Dec" });
    expect(months.every((m) => m.year === 2025)).toBe(true);
  });

  it("returns Apr 2024 - Mar 2025 for FYE 03-31, fiscal year 2025", () => {
    const months = getFiscalYearMonths("03-31", 2025);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2024, month: 4, label: "Apr" });
    expect(months[8]).toEqual({ year: 2024, month: 12, label: "Dec" });
    expect(months[9]).toEqual({ year: 2025, month: 1, label: "Jan" });
    expect(months[11]).toEqual({ year: 2025, month: 3, label: "Mar" });
  });

  it("returns Jul 2024 - Jun 2025 for FYE 06-30, fiscal year 2025", () => {
    const months = getFiscalYearMonths("06-30", 2025);
    expect(months).toHaveLength(12);
    expect(months[0]).toEqual({ year: 2024, month: 7, label: "Jul" });
    expect(months[5]).toEqual({ year: 2024, month: 12, label: "Dec" });
    expect(months[6]).toEqual({ year: 2025, month: 1, label: "Jan" });
    expect(months[11]).toEqual({ year: 2025, month: 6, label: "Jun" });
  });

  it("returns 12 months for any valid FYE", () => {
    const fyeOptions = ["01-31", "02-28", "03-31", "06-30", "09-30", "12-31"];
    for (const fye of fyeOptions) {
      const months = getFiscalYearMonths(fye, 2025);
      expect(months).toHaveLength(12);
    }
  });

  it("labels use short month names (Jan, Feb, Mar, etc.)", () => {
    const months = getFiscalYearMonths("12-31", 2025);
    const expectedLabels = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    expect(months.map((m) => m.label)).toEqual(expectedLabels);
  });
});

describe("getFiscalYearDateRange", () => {
  it("returns Jan 1 - Dec 31 for FYE 12-31, fiscal year 2025", () => {
    const { startDate, endDate } = getFiscalYearDateRange("12-31", 2025);
    expect(startDate.getFullYear()).toBe(2025);
    expect(startDate.getMonth()).toBe(0); // January
    expect(startDate.getDate()).toBe(1);
    expect(endDate.getFullYear()).toBe(2025);
    expect(endDate.getMonth()).toBe(11); // December
    expect(endDate.getDate()).toBe(31);
  });

  it("returns Apr 1 2024 - Mar 31 2025 for FYE 03-31, fiscal year 2025", () => {
    const { startDate, endDate } = getFiscalYearDateRange("03-31", 2025);
    expect(startDate.getFullYear()).toBe(2024);
    expect(startDate.getMonth()).toBe(3); // April
    expect(startDate.getDate()).toBe(1);
    expect(endDate.getFullYear()).toBe(2025);
    expect(endDate.getMonth()).toBe(2); // March
    expect(endDate.getDate()).toBe(31);
  });
});
