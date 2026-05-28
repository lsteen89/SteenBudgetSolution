import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalTargetAmountModal from "./SavingsGoalTargetAmountModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const baseRow: BudgetMonthSavingsGoalEditorRowDto = {
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

describe("SavingsGoalTargetAmountModal", () => {
  it("submits the new target amount", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "75000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ targetAmount: 75000 });
  });

  it("blocks targets below amountSaved with inline copy and never calls onSubmit", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "5000" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText(
        /target cannot be lower than what you have already saved/i,
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks zero and rejects values with more than 2 decimals", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "1234.567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText(/valid amount with up to 2 decimals/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      screen.getByText(/must be greater than 0/i),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the outcome preview when the target is feasible", () => {
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "55000" },
    });

    const outcome = screen.getByTestId("savings-goal-target-amount-outcome");
    // (55 000 - 10 000) / 1500 = 30 months
    expect(outcome.textContent).toMatch(/30 months/i);
  });

  it("disables Save when the target equals the current value", () => {
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Initial seed mirrors the row's target — Save must be disabled.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByTestId("savings-goal-target-amount-unchanged"),
    ).toBeInTheDocument();
  });

  it("closes without calling onSubmit when the value is unchanged on submit", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(
      screen
        .getByLabelText("New target amount")
        .closest("form") as HTMLFormElement,
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Save while a mutation is in flight", () => {
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        isSaving
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target amount"), {
      target: { value: "75000" },
    });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("renders the error message when one is passed", () => {
    render(
      <SavingsGoalTargetAmountModal
        open
        row={baseRow}
        monthLabel="May 2026"
        errorMessage="The month is closed."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(
      screen.getByTestId("savings-goal-target-amount-error"),
    ).toHaveTextContent("The month is closed.");
  });
});
