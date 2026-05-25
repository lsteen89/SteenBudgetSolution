import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalTargetDateModal from "./SavingsGoalTargetDateModal";

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

describe("SavingsGoalTargetDateModal", () => {
  it("submits a recomputed monthly amount in recalcMonthly mode", async () => {
    vi.useRealTimers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalTargetDateModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target date"), {
      target: { value: "2027-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 3334,
      targetDate: "2027-05-01",
      mode: "recalcMonthly",
    });
  });

  it("submits the unchanged monthly amount in keepMonthly mode", async () => {
    vi.useRealTimers();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <SavingsGoalTargetDateModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target date"), {
      target: { value: "2027-05" },
    });
    fireEvent.click(screen.getByRole("radio", { name: /keep monthly amount/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 1500,
      targetDate: "2027-05-01",
      mode: "keepMonthly",
    });
  });

  it("blocks invalid target dates", () => {
    const onSubmit = vi.fn();
    render(
      <SavingsGoalTargetDateModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("New target date"), {
      target: { value: "2026-05" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    expect(screen.getByText(/Choose a future month/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens disabled with the orphan scope hint when plan updates are unsupported", () => {
    render(
      <SavingsGoalTargetDateModal
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

    expect(screen.getByLabelText("New target date")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save new date" })).toBeDisabled();
    expect(
      screen.getByTestId("savings-goal-target-date-scope-toggle-currentMonthOnly"),
    ).toBeEnabled();
    expect(
      screen.getByTestId(
        "savings-goal-target-date-scope-toggle-currentMonthAndBudgetPlan",
      ),
    ).toBeDisabled();
    expect(
      screen.getAllByText(/only exists in the current month/i).length,
    ).toBeGreaterThan(0);
  });

  it("renders the snapshot even when targetAmount is null", () => {
    render(
      <SavingsGoalTargetDateModal
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
});
