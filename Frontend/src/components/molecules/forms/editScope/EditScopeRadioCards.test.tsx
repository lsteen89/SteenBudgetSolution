import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import EditScopeRadioCards from "./EditScopeRadioCards";

// Fixed English locale so the resolved scope copy can be asserted directly.
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EditScopeRadioCards", () => {
  it("distinguishes selected-month-only from budget-plan-forward, named by month", () => {
    render(
      <EditScopeRadioCards
        value="currentMonthOnly"
        onChange={vi.fn()}
        monthLabel="June 2026"
        testId="scope"
      />,
    );

    // Month-only scope is named by the selected month — not "current month".
    const onlyThisMonth = screen.getByTestId("scope-currentMonthOnly");
    expect(onlyThisMonth).toHaveTextContent("Only for June 2026");
    expect(onlyThisMonth).toHaveTextContent("Only affects June 2026.");

    // Budget-plan-forward is visually + textually a separate choice, and the
    // help text spells out it reaches future months — clearly not month-only.
    const planForward = screen.getByTestId("scope-currentMonthAndBudgetPlan");
    expect(planForward).toHaveTextContent("Update the budget plan going forward");
    expect(planForward).toHaveTextContent("June 2026 and future months.");

    const planOnly = screen.getByTestId("scope-budgetPlanOnly");
    expect(planOnly).toHaveTextContent("Budget plan going forward only");
  });

  it("never exposes backend scope names or 'current month' to the user", () => {
    const { container } = render(
      <EditScopeRadioCards
        value="currentMonthOnly"
        onChange={vi.fn()}
        monthLabel="June 2026"
        testId="scope"
      />,
    );

    const text = container.textContent ?? "";
    expect(text).not.toMatch(/current month/i);
    expect(text).not.toMatch(/currentMonthOnly|currentMonthAndBudgetPlan|budgetPlanOnly/);
    expect(text).not.toMatch(/default|baseline|source/i);
  });

  it("selecting the plan-forward card reports the plan-forward scope", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <EditScopeRadioCards
        value="currentMonthOnly"
        onChange={onChange}
        monthLabel="June 2026"
        testId="scope"
      />,
    );

    await user.click(screen.getByTestId("scope-currentMonthAndBudgetPlan"));
    expect(onChange).toHaveBeenCalledWith("currentMonthAndBudgetPlan");
  });

  it("disables plan-forward options and forces month-only when the plan cannot change", () => {
    const onChange = vi.fn();

    render(
      <EditScopeRadioCards
        value="currentMonthAndBudgetPlan"
        onChange={onChange}
        monthLabel="June 2026"
        canUpdatePlan={false}
        disabledPlanHint="This row only exists for this month."
        testId="scope"
      />,
    );

    // Month-only stays selectable; both plan-forward options are locked off.
    expect(screen.getByTestId("scope-currentMonthOnly")).not.toBeDisabled();
    expect(screen.getByTestId("scope-currentMonthAndBudgetPlan")).toBeDisabled();
    expect(screen.getByTestId("scope-budgetPlanOnly")).toBeDisabled();

    // A row that cannot touch the plan is coerced back to month-only so a stale
    // plan-forward value can never be submitted.
    expect(onChange).toHaveBeenCalledWith("currentMonthOnly");

    expect(
      screen.getByText("This row only exists for this month."),
    ).toBeInTheDocument();
  });
});
