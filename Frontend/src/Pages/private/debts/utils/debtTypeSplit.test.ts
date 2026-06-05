import { describe, expect, it } from "vitest";
import {
  bucketDebtType,
  debtTypeSplitTotal,
  splitDebtRowsBy,
} from "./debtTypeSplit";

describe("bucketDebtType", () => {
  it.each([
    ["revolving", "credit"],
    ["REVOLVING", "credit"],
    ["installment", "installment"],
    ["bank_loan", "loan"],
    ["private", "loan"],
  ])("maps %s to %s", (input, expected) => {
    expect(bucketDebtType(input)).toBe(expected);
  });

  it("falls back to 'loan' for unknown or blank type so totals are never lost", () => {
    expect(bucketDebtType("")).toBe("loan");
    expect(bucketDebtType("mortgage_v2")).toBe("loan");
    expect(bucketDebtType(undefined)).toBe("loan");
    expect(bucketDebtType(null)).toBe("loan");
  });
});

describe("splitDebtRowsBy", () => {
  it("sums the selector grouped by bucket and ignores buckets with no rows", () => {
    const rows = [
      { type: "bank_loan", monthlyPayment: 1500 },
      { type: "private", monthlyPayment: 800 },
      { type: "revolving", monthlyPayment: 600 },
      { type: "installment", monthlyPayment: 300 },
    ];
    const split = splitDebtRowsBy(rows, (row) => row.monthlyPayment);
    expect(split).toEqual({ loan: 2300, credit: 600, installment: 300 });
    expect(debtTypeSplitTotal(split)).toBe(3200);
  });

  it("returns zero for every bucket when given an empty list", () => {
    expect(splitDebtRowsBy([], (row) => row.monthlyPayment)).toEqual({
      loan: 0,
      credit: 0,
      installment: 0,
    });
  });
});
