import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SavingsGoalContributionModal from "./SavingsGoalContributionModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const linkedRow = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  // Seeded date is always > "today" in tests so the form's date validation
  // does not fail spuriously while we exercise the contribution path.
  targetDate: "2030-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

beforeEach(() => {
  // Pin "today" so every date validation test runs deterministically.
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SavingsGoalContributionModal", () => {
  it("shows scope cards for source-linked rows", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("radio", { name: /only for may 2026/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    ).toBeInTheDocument();
  });

  it("hides budget-plan scopes for month-only rows", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={{
          ...linkedRow,
          sourceSavingsGoalId: null,
          isMonthOnly: true,
          canUpdateDefault: false,
        }}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This savings goal only exists in the current month.",
      ),
    ).toBeInTheDocument();
  });

  it("seeds the target date input from the row in yyyy-MM-dd form", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      (screen.getByLabelText("Target date") as HTMLInputElement).value,
    ).toBe("2030-12-31");
  });

  it("disables the date field by default (currentMonthOnly scope)", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const dateInput = screen.getByLabelText("Target date") as HTMLInputElement;
    expect(dateInput).toBeDisabled();
    expect(dateInput.value).toBe("2030-12-31");
    expect(
      screen.getByText(
        /Target date can be changed when the budget plan is updated/i,
      ),
    ).toBeInTheDocument();
  });

  it("disables the date field for budgetPlanOnly scope and reverts edits", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Target date"), {
      target: { value: "2031-06-30" },
    });
    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );

    const dateInput = screen.getByLabelText("Target date") as HTMLInputElement;
    expect(dateInput).toBeDisabled();
    // The disabled state must show the stored value, not the draft.
    expect(dateInput.value).toBe("2030-12-31");
  });

  it("submits monthly amount AND target date in one onSubmit call when scope honors the plan", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2000" },
    });
    fireEvent.change(screen.getByLabelText("Target date"), {
      target: { value: "2031-06-30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2000,
      targetDate: "2031-06-30",
      scope: "currentMonthAndBudgetPlan",
    });
  });

  it("omits targetDate from the payload when scope is currentMonthOnly", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2100,
      targetDate: undefined,
      scope: "currentMonthOnly",
    });
  });

  it("omits targetDate from the payload when scope is budgetPlanOnly", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /budget plan going forward only/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2200,
      targetDate: undefined,
      scope: "budgetPlanOnly",
    });
  });

  it("omits targetDate when date editing is enabled but the date did not change", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2050" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2050,
      targetDate: undefined,
      scope: "currentMonthAndBudgetPlan",
    });
  });

  it("renders a localized European caption beneath the date input", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const caption = screen.getByTestId(
      "savings-goal-modal-target-date-caption",
    );
    // The mocked locale is en-US, but the format we produce is always
    // unambiguous (month name + day + year) — never MM/DD/YYYY digits.
    expect(caption).toHaveTextContent(/December/i);
    expect(caption).toHaveTextContent(/2030/);
    expect(caption).not.toHaveTextContent(/12\/31\/2030/);
  });

  it("preserves stored decimal precision when seeding the input", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={{ ...linkedRow, monthlyContribution: 1234.56 }}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      (screen.getByLabelText("Monthly amount") as HTMLInputElement).value,
    ).toBe("1234.56");
  });

  it("submits a decimal monthly amount without truncation and does not send the unchanged date", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "1234,56" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 1234.56,
      targetDate: undefined,
      scope: "currentMonthOnly",
    });
  });

  it("rejects more than 2 decimals via the Zod schema", () => {
    const onSubmit = vi.fn();

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "1234.567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText(/Enter a valid amount with up to 2 decimals/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a target date in the past and blocks save (when date editing is enabled)", () => {
    const onSubmit = vi.fn();

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Target date"), {
      target: { value: "2026-05-18" }, // 1 day before the pinned today
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText(/Choose a date in the future/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a target date more than 40 years ahead and blocks save (when date editing is enabled)", () => {
    const onSubmit = vi.fn();

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Target date"), {
      target: { value: "2080-01-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText(/within 40 years/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows a soft budget warning when the increase exceeds remaining room", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        remainingBudgetRoom={100}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2000" },
    });

    const warning = screen.getByTestId("savings-goal-budget-warning");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/400/);
  });

  it("does not warn when only target date changes", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        remainingBudgetRoom={0}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("radio", {
        name: /update the budget plan going forward/i,
      }),
    );
    fireEvent.change(screen.getByLabelText("Target date"), {
      target: { value: "2031-09-30" },
    });

    expect(
      screen.queryByTestId("savings-goal-budget-warning"),
    ).not.toBeInTheDocument();
  });

  it("does not warn when contribution is unchanged", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        remainingBudgetRoom={0}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("savings-goal-budget-warning"),
    ).not.toBeInTheDocument();
  });

  it("does not warn when contribution is lowered, even with zero room", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        remainingBudgetRoom={0}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "500" },
    });

    expect(
      screen.queryByTestId("savings-goal-budget-warning"),
    ).not.toBeInTheDocument();
  });

  it("keeps save available while a budget warning is shown", async () => {
    vi.useRealTimers();
    vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        remainingBudgetRoom={100}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "2000" },
    });

    expect(screen.getByTestId("savings-goal-budget-warning")).toBeInTheDocument();
    const save = screen.getByRole("button", { name: "Save" });
    expect(save).not.toBeDisabled();
    fireEvent.click(save);

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2000,
      targetDate: undefined,
      scope: "currentMonthOnly",
    });
  });

  it("suppresses the warning when remainingBudgetRoom is unavailable", () => {
    render(
      <SavingsGoalContributionModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Monthly amount"), {
      target: { value: "999999" },
    });

    expect(
      screen.queryByTestId("savings-goal-budget-warning"),
    ).not.toBeInTheDocument();
  });
});
