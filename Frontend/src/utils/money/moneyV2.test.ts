import { describe, expect, it } from "vitest";
import { moneyDecimalsFor } from "./moneyV2";

describe("moneyDecimalsFor", () => {
  it("returns 0 for whole krona", () => {
    expect(moneyDecimalsFor(0)).toBe(0);
    expect(moneyDecimalsFor(1500)).toBe(0);
    expect(moneyDecimalsFor(-25)).toBe(0);
  });

  it("returns 2 when the value has cent precision", () => {
    expect(moneyDecimalsFor(0.5)).toBe(2);
    expect(moneyDecimalsFor(1234.56)).toBe(2);
    expect(moneyDecimalsFor(0.01)).toBe(2);
  });

  it("treats floating-point residue as whole", () => {
    // 0.1 + 0.2 = 0.30000000000000004 but the stored value should be treated as whole 0.3
    expect(moneyDecimalsFor(1500.0000000001)).toBe(0);
  });

  it("returns 0 for non-numeric/non-finite inputs", () => {
    expect(moneyDecimalsFor(null)).toBe(0);
    expect(moneyDecimalsFor(undefined)).toBe(0);
    expect(moneyDecimalsFor(Number.NaN)).toBe(0);
    expect(moneyDecimalsFor(Number.POSITIVE_INFINITY)).toBe(0);
  });
});
