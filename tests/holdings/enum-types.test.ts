import { describe, it, expect } from "vitest";
import { HOLDING_TYPE_TO_GL, DEFAULT_POSITION_NAME } from "@/lib/holdings/constants";

describe("SubledgerItemType enum coverage", () => {
  const NEW_TYPES = [
    "BANK_ACCOUNT",
    "BROKERAGE_ACCOUNT",
    "CREDIT_CARD",
    "REAL_ESTATE",
    "EQUIPMENT",
    "LOAN",
    "PRIVATE_FUND",
    "MORTGAGE",
    "LINE_OF_CREDIT",
    "TRUST_ACCOUNT",
    "OPERATING_BUSINESS",
    "NOTES_RECEIVABLE",
    "OTHER",
  ] as const;

  const OLD_TYPES = ["INVESTMENT", "PRIVATE_EQUITY", "RECEIVABLE"] as const;

  describe("HOLDING_TYPE_TO_GL", () => {
    it("maps all 13 new holding types", () => {
      for (const type of NEW_TYPES) {
        expect(HOLDING_TYPE_TO_GL[type]).toBeDefined();
        expect(HOLDING_TYPE_TO_GL[type].parentPrefix).toBeTruthy();
        expect(HOLDING_TYPE_TO_GL[type].accountType).toBeTruthy();
      }
    });

    it("keeps old types for backward compatibility", () => {
      for (const type of OLD_TYPES) {
        expect(HOLDING_TYPE_TO_GL[type]).toBeDefined();
        expect(HOLDING_TYPE_TO_GL[type].parentPrefix).toBeTruthy();
        expect(HOLDING_TYPE_TO_GL[type].accountType).toBeTruthy();
      }
    });

    it("maps assets to 1xxxx prefixes", () => {
      expect(HOLDING_TYPE_TO_GL.BANK_ACCOUNT.parentPrefix).toBe("11000");
      expect(HOLDING_TYPE_TO_GL.BANK_ACCOUNT.accountType).toBe("ASSET");
      expect(HOLDING_TYPE_TO_GL.BROKERAGE_ACCOUNT.parentPrefix).toBe("12000");
      expect(HOLDING_TYPE_TO_GL.BROKERAGE_ACCOUNT.accountType).toBe("ASSET");
      expect(HOLDING_TYPE_TO_GL.TRUST_ACCOUNT.parentPrefix).toBe("12500");
      expect(HOLDING_TYPE_TO_GL.PRIVATE_FUND.parentPrefix).toBe("13000");
      expect(HOLDING_TYPE_TO_GL.NOTES_RECEIVABLE.parentPrefix).toBe("14000");
      expect(HOLDING_TYPE_TO_GL.REAL_ESTATE.parentPrefix).toBe("16000");
      expect(HOLDING_TYPE_TO_GL.EQUIPMENT.parentPrefix).toBe("17000");
      expect(HOLDING_TYPE_TO_GL.OPERATING_BUSINESS.parentPrefix).toBe("18000");
      expect(HOLDING_TYPE_TO_GL.OTHER.parentPrefix).toBe("19000");
    });

    it("maps liabilities to 2xxxx prefixes", () => {
      expect(HOLDING_TYPE_TO_GL.CREDIT_CARD.parentPrefix).toBe("21000");
      expect(HOLDING_TYPE_TO_GL.CREDIT_CARD.accountType).toBe("LIABILITY");
      expect(HOLDING_TYPE_TO_GL.LOAN.parentPrefix).toBe("22000");
      expect(HOLDING_TYPE_TO_GL.LOAN.accountType).toBe("LIABILITY");
      expect(HOLDING_TYPE_TO_GL.MORTGAGE.parentPrefix).toBe("23000");
      expect(HOLDING_TYPE_TO_GL.MORTGAGE.accountType).toBe("LIABILITY");
      expect(HOLDING_TYPE_TO_GL.LINE_OF_CREDIT.parentPrefix).toBe("24000");
      expect(HOLDING_TYPE_TO_GL.LINE_OF_CREDIT.accountType).toBe("LIABILITY");
    });

    it("maps old types to same prefixes as their replacements", () => {
      expect(HOLDING_TYPE_TO_GL.INVESTMENT.parentPrefix).toBe("12000");
      expect(HOLDING_TYPE_TO_GL.PRIVATE_EQUITY.parentPrefix).toBe("13000");
      expect(HOLDING_TYPE_TO_GL.RECEIVABLE.parentPrefix).toBe("14000");
    });
  });

  describe("DEFAULT_POSITION_NAME", () => {
    it("maps all 13 new types to default position names", () => {
      for (const type of NEW_TYPES) {
        expect(DEFAULT_POSITION_NAME[type]).toBeTruthy();
      }
    });

    it("maps old types for backward compatibility", () => {
      for (const type of OLD_TYPES) {
        expect(DEFAULT_POSITION_NAME[type]).toBeTruthy();
      }
    });

    it("has sensible defaults", () => {
      expect(DEFAULT_POSITION_NAME.BANK_ACCOUNT).toBe("Cash");
      expect(DEFAULT_POSITION_NAME.BROKERAGE_ACCOUNT).toBe("Cash");
      expect(DEFAULT_POSITION_NAME.CREDIT_CARD).toBe("Balance");
      expect(DEFAULT_POSITION_NAME.REAL_ESTATE).toBe("Property");
      expect(DEFAULT_POSITION_NAME.EQUIPMENT).toBe("Equipment");
      expect(DEFAULT_POSITION_NAME.LOAN).toBe("Principal");
      expect(DEFAULT_POSITION_NAME.PRIVATE_FUND).toBe("LP Interest");
      expect(DEFAULT_POSITION_NAME.MORTGAGE).toBe("Principal");
      expect(DEFAULT_POSITION_NAME.LINE_OF_CREDIT).toBe("Balance");
      expect(DEFAULT_POSITION_NAME.TRUST_ACCOUNT).toBe("Corpus");
      expect(DEFAULT_POSITION_NAME.OPERATING_BUSINESS).toBe("Equity Interest");
      expect(DEFAULT_POSITION_NAME.NOTES_RECEIVABLE).toBe("Note");
      expect(DEFAULT_POSITION_NAME.OTHER).toBe("General");
    });
  });
});
