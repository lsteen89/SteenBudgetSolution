import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalRenameModal from "./SavingsGoalRenameModal";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
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

describe("SavingsGoalRenameModal", () => {
  it("submits the trimmed name", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "  Holiday fund  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ name: "Holiday fund" });
  });

  it("blocks empty submissions and surfaces the validation copy", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(/Enter a name/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables save when the trimmed name matches the row name", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Initial state seeds the input with the current row name, so it is
    // unchanged and save is disabled.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(
      screen.getByTestId("savings-goal-rename-unchanged"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes without calling onSubmit when the trimmed name matches", () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    // Padding whitespace still maps to the same trimmed value — the
    // modal should defer to the BE's no-op short-circuit by not firing
    // a round-trip and simply closing.
    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: " Emergency fund " },
    });
    // Force-submit via the form because the Save button is disabled by
    // the unchanged-name guard.
    fireEvent.submit(
      screen.getByLabelText("New name").closest("form") as HTMLFormElement,
    );

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Save while a mutation is in flight", () => {
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        isSaving
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("New name"), {
      target: { value: "Anything else" },
    });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });

  it("renders an error message when one is passed", () => {
    render(
      <SavingsGoalRenameModal
        open
        row={baseRow}
        monthLabel="May 2026"
        errorMessage="The month is closed."
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("savings-goal-rename-error")).toHaveTextContent(
      "The month is closed.",
    );
  });
});
