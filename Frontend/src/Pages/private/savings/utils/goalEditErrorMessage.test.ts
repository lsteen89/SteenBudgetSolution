import { describe, expect, it, vi } from "vitest";
import {
  renameErrorMessage,
  targetAmountErrorMessage,
} from "./goalEditErrorMessage";

/**
 * Stand-in for the `tDict(key, locale, dict)` closures used inside the
 * page handlers. Returning the key verbatim makes assertions precise —
 * a regression that maps the wrong key surfaces in the test name.
 */
const renameT = vi.fn((key: string): string => key) as unknown as Parameters<
  typeof renameErrorMessage
>[1];
const targetT = vi.fn((key: string): string => key) as unknown as Parameters<
  typeof targetAmountErrorMessage
>[1];

describe("renameErrorMessage", () => {
  it("maps MonthIsClosed to the dedicated retry-won't-help key", () => {
    expect(
      renameErrorMessage({ code: "BudgetMonth.MonthIsClosed" }, renameT),
    ).toBe("toastErrorMonthClosed");
  });

  it("maps SourcePlanNotFound to the dedicated key", () => {
    expect(
      renameErrorMessage(
        { code: "BudgetMonthSavingsGoal.SourcePlanNotFound" },
        renameT,
      ),
    ).toBe("toastErrorSourcePlanMissing");
  });

  it("maps the row-gone family (NotFound / RowDeleted / RowClosed) to one key", () => {
    expect(
      renameErrorMessage(
        { code: "BudgetMonthSavingsGoal.NotFound" },
        renameT,
      ),
    ).toBe("toastErrorRowGone");
    expect(
      renameErrorMessage(
        { code: "BudgetMonthSavingsGoal.RowDeleted" },
        renameT,
      ),
    ).toBe("toastErrorRowGone");
    expect(
      renameErrorMessage(
        { code: "BudgetMonthSavingsGoal.RowClosed" },
        renameT,
      ),
    ).toBe("toastErrorRowGone");
  });

  it("falls back to the generic key on an unknown code", () => {
    expect(
      renameErrorMessage(
        { code: "BudgetMonthSavingsGoal.Whatever" },
        renameT,
      ),
    ).toBe("toastError");
  });

  it("falls back to the generic key when the throw is not an ApiProblem", () => {
    expect(renameErrorMessage(new Error("network"), renameT)).toBe(
      "toastError",
    );
    expect(renameErrorMessage("string throw", renameT)).toBe("toastError");
    expect(renameErrorMessage(null, renameT)).toBe("toastError");
  });
});

describe("targetAmountErrorMessage", () => {
  it("maps TargetBelowSaved to the dedicated key", () => {
    expect(
      targetAmountErrorMessage(
        { code: "BudgetMonthSavingsGoal.TargetBelowSaved" },
        targetT,
      ),
    ).toBe("toastErrorTargetBelowSaved");
  });

  it("maps MonthIsClosed to the dedicated key", () => {
    expect(
      targetAmountErrorMessage({ code: "BudgetMonth.MonthIsClosed" }, targetT),
    ).toBe("toastErrorMonthClosed");
  });

  it("falls back to the generic key on an unknown code", () => {
    expect(
      targetAmountErrorMessage(
        { code: "BudgetMonthSavingsGoal.Whatever" },
        targetT,
      ),
    ).toBe("toastError");
  });

  it("falls back to the generic key when the throw is not an ApiProblem", () => {
    expect(targetAmountErrorMessage(new Error("boom"), targetT)).toBe(
      "toastError",
    );
    expect(targetAmountErrorMessage("string throw", targetT)).toBe(
      "toastError",
    );
    expect(targetAmountErrorMessage(undefined, targetT)).toBe("toastError");
  });
});
