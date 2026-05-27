import { describe, expect, it, vi } from "vitest";
import { transferErrorMessage } from "./transferErrorMessage";

/**
 * Stand-in for the `tDict(key, locale, savingsEditorPageDict)` closure
 * used in the page. We don't care about the real dictionary here — the
 * mapping under test is code → key. Returning the key verbatim makes
 * the assertion precise: a regression would map to the wrong key.
 */
const tStub = vi.fn(
  (key: string): string => key,
) as unknown as Parameters<typeof transferErrorMessage>[1];

describe("transferErrorMessage", () => {
  it("maps the BE withdraw-below-zero code to the dedicated key", () => {
    expect(
      transferErrorMessage(
        { code: "BudgetMonthSavingsGoal.WithdrawalBelowZero" },
        tStub,
      ),
    ).toBe("transferToastErrorWithdrawTooMuch");
  });

  it("maps the BE source-plan-not-found code to the dedicated key", () => {
    expect(
      transferErrorMessage(
        { code: "BudgetMonthSavingsGoal.SourcePlanNotFound" },
        tStub,
      ),
    ).toBe("transferToastErrorSourcePlanMissing");
  });

  it("maps the BE month-closed code to the dedicated key", () => {
    expect(
      transferErrorMessage({ code: "BudgetMonth.MonthIsClosed" }, tStub),
    ).toBe("transferToastErrorMonthClosed");
  });

  it("falls back to the generic key on an unknown code", () => {
    expect(
      transferErrorMessage(
        { code: "BudgetMonthSavingsGoal.Whatever" },
        tStub,
      ),
    ).toBe("transferToastError");
  });

  it("falls back to the generic key when the throw is not an ApiProblem", () => {
    expect(transferErrorMessage(new Error("network"), tStub)).toBe(
      "transferToastError",
    );
    expect(transferErrorMessage("string throw", tStub)).toBe(
      "transferToastError",
    );
    expect(transferErrorMessage(null, tStub)).toBe("transferToastError");
  });
});
