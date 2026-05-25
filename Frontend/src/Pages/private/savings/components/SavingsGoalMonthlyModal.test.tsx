import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalMonthlyModal from "./SavingsGoalMonthlyModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const linkedRow: BudgetMonthSavingsGoalEditorRowDto = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 50000,
  targetDate: "2030-12-31",
  amountSaved: 10000,
  monthlyContribution: 1500,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 4, 19, 12, 0, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SavingsGoalMonthlyModal", () => {
  it("submits monthlyContribution and scope only", async () => {
    vi.useRealTimers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalMonthlyModal
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
      target: { value: "2200" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 2200,
      scope: "currentMonthAndBudgetPlan",
    });
  });

  it("blocks invalid monthly values", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalMonthlyModal
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

  it("shows the budget warning when an increase exceeds remaining room", () => {
    render(
      <SavingsGoalMonthlyModal
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

    expect(screen.getByTestId("savings-goal-budget-warning")).toHaveTextContent(
      /400/,
    );
  });

  it("renders the snapshot even when targetAmount is null", () => {
    render(
      <SavingsGoalMonthlyModal
        open
        row={{ ...linkedRow, targetAmount: null }}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    const snapshot = screen.getByTestId("savings-goal-modal-snapshot");
    expect(snapshot).toHaveTextContent(/saved/i);
    expect(snapshot).toHaveTextContent("—");
  });

  it("disables plan-scope cards for orphan rows", () => {
    render(
      <SavingsGoalMonthlyModal
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
      screen.getByTestId("savings-goal-monthly-scope-toggle-currentMonthOnly"),
    ).toBeEnabled();
    expect(
      screen.getByTestId(
        "savings-goal-monthly-scope-toggle-currentMonthAndBudgetPlan",
      ),
    ).toBeDisabled();
    expect(
      screen.getByText("This savings goal only exists in the current month."),
    ).toBeInTheDocument();
  });
});
