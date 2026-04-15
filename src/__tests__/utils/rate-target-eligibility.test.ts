import { describe, it, expect } from "vitest";
import {
  isHoldingEligibleForRateTarget,
  computeEffectiveMarketValue,
} from "@/lib/holdings/rate-target-eligibility";

describe("isHoldingEligibleForRateTarget", () => {
  it("returns true when holding has non-zero fairMarketValue and no positions", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: "100000",
        positions: [],
      })
    ).toBe(true);
  });

  it("returns true when holding FMV is null but positions sum to non-zero", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: null,
        positions: [{ marketValue: "50000" }],
      })
    ).toBe(true);
  });

  it("returns false when holding FMV is null and positions sum to zero", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: null,
        positions: [{ marketValue: "0" }],
      })
    ).toBe(false);
  });

  it("returns false when holding FMV is null and positions array is empty", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: null,
        positions: [],
      })
    ).toBe(false);
  });

  it("returns true when holding FMV is '0' but positions sum to non-zero (positions override zero holding FMV)", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: "0",
        positions: [{ marketValue: "50000" }],
      })
    ).toBe(true);
  });

  it("returns false when both holding FMV and positions are all zero", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: "0",
        positions: [{ marketValue: "0" }, { marketValue: "0" }],
      })
    ).toBe(false);
  });

  it("returns true when holding FMV is null and positions sum (multiple positions) to non-zero", () => {
    expect(
      isHoldingEligibleForRateTarget({
        fairMarketValue: null,
        positions: [
          { marketValue: "10000" },
          { marketValue: "25000" },
          { marketValue: "5000" },
        ],
      })
    ).toBe(true);
  });

  it("treats missing positions field as empty array", () => {
    expect(
      isHoldingEligibleForRateTarget({ fairMarketValue: "75000" })
    ).toBe(true);
    expect(
      isHoldingEligibleForRateTarget({ fairMarketValue: null })
    ).toBe(false);
  });
});

describe("computeEffectiveMarketValue", () => {
  it("returns parsed holding FMV when non-zero", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: "100000",
        positions: [{ marketValue: "9999" }],
      })
    ).toBe(100000);
  });

  it("returns SUM of position marketValues when holding FMV is null", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: null,
        positions: [{ marketValue: "10000" }, { marketValue: "25000" }],
      })
    ).toBe(35000);
  });

  it("returns SUM of position marketValues when holding FMV is zero", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: "0",
        positions: [{ marketValue: "50000" }],
      })
    ).toBe(50000);
  });

  it("returns 0 when both holding FMV and positions are null/zero", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: null,
        positions: [],
      })
    ).toBe(0);
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: "0",
        positions: [{ marketValue: "0" }],
      })
    ).toBe(0);
  });

  it("handles mixed numeric/string inputs via parseFloat; invalid values contribute 0", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: null,
        positions: [
          { marketValue: "abc" },
          { marketValue: "" },
          { marketValue: null },
          { marketValue: "1000" },
        ],
      })
    ).toBe(1000);
  });

  it("returns 0 when holding FMV is invalid string and positions are missing/invalid", () => {
    expect(
      computeEffectiveMarketValue({
        fairMarketValue: "not-a-number",
        positions: [],
      })
    ).toBe(0);
  });
});
