import { describe, it, expect } from "vitest";
import { parseBankStatementCsv } from "@/lib/bank-transactions/csv-parser";

/**
 * Phase 12-09: Multi-account CSV parsing.
 *
 * When the ColumnMappingUI maps the optional "account" role to a CSV column,
 * parseBankStatementCsv must surface the per-row value on ParsedBankRow.accountRef.
 * Callers downstream (bank-transactions POST) resolve this to a subledgerItem.
 *
 * Single-account (legacy) behavior remains unchanged: no accountRef field is set
 * when mapping.account is absent.
 */
describe("parseBankStatementCsv — multi-account (accountRef)", () => {
  it("populates accountRef per row when mapping.account is provided", () => {
    const csv = `Date,Description,Amount,Account
2026-01-05,Test A1,-100,Chase Checking
2026-01-06,Test B1,-50,Wells Fargo`;

    const mapping = {
      date: "Date",
      description: "Description",
      amount: "Amount",
      account: "Account",
    };

    const rows = parseBankStatementCsv(csv, mapping);

    expect(rows).toHaveLength(2);
    expect(rows[0].accountRef).toBe("Chase Checking");
    expect(rows[1].accountRef).toBe("Wells Fargo");
  });

  it("returns empty string accountRef when Account column value is blank/missing", () => {
    const csv = `Date,Description,Amount,Account
2026-01-05,Row with account,-100,Chase Checking
2026-01-06,Row without account,-50,`;

    const mapping = {
      date: "Date",
      description: "Description",
      amount: "Amount",
      account: "Account",
    };

    const rows = parseBankStatementCsv(csv, mapping);

    expect(rows).toHaveLength(2);
    expect(rows[0].accountRef).toBe("Chase Checking");
    // Blank cell -> empty accountRef (caller flags as unresolved)
    expect(rows[1].accountRef).toBe("");
  });

  it("does not set accountRef when mapping.account is absent (backward compat)", () => {
    const csv = `Date,Description,Amount
2026-01-05,No Account Column,-100`;

    const mapping = {
      date: "Date",
      description: "Description",
      amount: "Amount",
    };

    const rows = parseBankStatementCsv(csv, mapping);

    expect(rows).toHaveLength(1);
    expect(rows[0].accountRef).toBeUndefined();
  });

  it("preserves debit/credit + reference behavior when account is mapped", () => {
    const csv = `Date,Description,Debit,Credit,Reference,Account
2026-01-05,Office Supplies,120.50,,REF-001,Chase Checking
2026-01-06,Client Payment,,3500.00,REF-002,Wells Fargo`;

    const mapping = {
      date: "Date",
      description: "Description",
      debit: "Debit",
      credit: "Credit",
      reference: "Reference",
      account: "Account",
    };

    const rows = parseBankStatementCsv(csv, mapping);

    expect(rows).toHaveLength(2);

    // Debit = negative amount (money out)
    expect(rows[0].amount).toBe(-120.5);
    expect(rows[0].reference).toBe("REF-001");
    expect(rows[0].accountRef).toBe("Chase Checking");

    // Credit = positive amount (money in)
    expect(rows[1].amount).toBe(3500);
    expect(rows[1].reference).toBe("REF-002");
    expect(rows[1].accountRef).toBe("Wells Fargo");
  });

  it("trims whitespace on accountRef values", () => {
    const csv = `Date,Description,Amount,Account
2026-01-05,Padded Account,-100,  Chase Checking  `;

    const mapping = {
      date: "Date",
      description: "Description",
      amount: "Amount",
      account: "Account",
    };

    const rows = parseBankStatementCsv(csv, mapping);

    expect(rows).toHaveLength(1);
    expect(rows[0].accountRef).toBe("Chase Checking");
  });
});
