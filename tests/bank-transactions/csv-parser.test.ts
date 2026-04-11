import { describe, it, expect } from "vitest";
import { parseBankStatementCsv } from "@/lib/bank-transactions/csv-parser";

describe("parseBankStatementCsv", () => {
  it("parses standard columns (Date, Description, Amount)", () => {
    const csv = `Date,Description,Amount
2025-01-15,AMAZON PURCHASE,-49.99
2025-01-16,PAYROLL DEPOSIT,5000.00`;

    const rows = parseBankStatementCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      date: "2025-01-15",
      description: "AMAZON PURCHASE",
      amount: -49.99,
    });
    expect(rows[1]).toEqual({
      date: "2025-01-16",
      description: "PAYROLL DEPOSIT",
      amount: 5000.0,
    });
  });

  it("auto-detects split debit/credit columns and converts to single signed amount", () => {
    const csv = `Date,Description,Debit,Credit
2025-01-15,OFFICE SUPPLIES,120.50,
2025-01-16,CLIENT PAYMENT,,3500.00`;

    const rows = parseBankStatementCsv(csv);

    expect(rows).toHaveLength(2);
    // Debit = negative (money going out), Credit = positive (money coming in)
    expect(rows[0].amount).toBe(-120.5);
    expect(rows[1].amount).toBe(3500.0);
  });

  it("handles alternate column names (Posted Date, Memo, Transaction Amount)", () => {
    const csv = `Posted Date,Memo,Transaction Amount
01/15/2025,RENT PAYMENT,-2500.00
01/16/2025,INTEREST INCOME,12.50`;

    const rows = parseBankStatementCsv(csv);

    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("01/15/2025");
    expect(rows[0].description).toBe("RENT PAYMENT");
    expect(rows[0].amount).toBe(-2500.0);
  });

  it("throws on empty CSV", () => {
    expect(() => parseBankStatementCsv("")).toThrow();
  });

  it("throws on missing required columns", () => {
    const csv = `Name,Value
foo,bar`;

    expect(() => parseBankStatementCsv(csv)).toThrow();
  });

  it("skips empty rows", () => {
    const csv = `Date,Description,Amount
2025-01-15,PURCHASE,-10.00

2025-01-17,DEPOSIT,500.00
`;

    const rows = parseBankStatementCsv(csv);
    expect(rows).toHaveLength(2);
  });

  it("handles quoted fields with commas inside", () => {
    const csv = `Date,Description,Amount
2025-01-15,"AMAZON.COM, INC",-75.00`;

    const rows = parseBankStatementCsv(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("AMAZON.COM, INC");
    expect(rows[0].amount).toBe(-75.0);
  });
});
