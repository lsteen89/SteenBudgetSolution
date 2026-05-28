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

function pickMonth(monthIndex0: number) {
  // <select> uses 1-based month values; tests express month by 0-based index
  // to stay aligned with `Date.getMonth()` semantics elsewhere in the suite.
  fireEvent.change(screen.getByTestId("savings-goal-target-month-month"), {
    target: { value: String(monthIndex0 + 1) },
  });
}
function pickYear(year: number) {
  fireEvent.change(screen.getByTestId("savings-goal-target-month-year"), {
    target: { value: String(year) },
  });
}

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

    // Two-step pick: year then month, matching how the UI is laid out.
    pickYear(2027);
    pickMonth(4); // May
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

    pickYear(2027);
    pickMonth(4);
    fireEvent.click(screen.getByRole("radio", { name: /keep monthly amount/i }));
    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 1500,
      targetDate: "2027-05-01",
      mode: "keepMonthly",
    });
  });

  it("disables past months for the current year so the user cannot pick them", () => {
    render(
      <SavingsGoalTargetDateModal
        open
        row={linkedRow}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Force the year back to today's year (default is +6 months → Nov 2026, same year).
    pickYear(2026);

    const monthSelect = screen.getByTestId(
      "savings-goal-target-month-month",
    ) as HTMLSelectElement;
    const optionsByValue = Array.from(monthSelect.options);

    // System time: May 2026 (month index 4). Jan–May should be disabled,
    // Jun–Dec enabled. This is the "can't pick a bad date" guarantee.
    expect(optionsByValue[0]!.disabled).toBe(true); // Jan
    expect(optionsByValue[4]!.disabled).toBe(true); // May (current month)
    expect(optionsByValue[5]!.disabled).toBe(false); // Jun
    expect(optionsByValue[11]!.disabled).toBe(false); // Dec
  });

  it("quick-pick chips set the target month deterministically", async () => {
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

    // +1 yr from May 2026 → May 2027-05-01. Recomputed monthly is
    // ceil(40 000 / 12) = 3 334, same as the explicit-pick spec above.
    fireEvent.click(screen.getByTestId("savings-goal-target-month-quick-12"));

    // Active chip exposes the "Pressed" state for AT.
    expect(
      screen.getByTestId("savings-goal-target-month-quick-12"),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByTestId("savings-goal-target-month-quick-3"),
    ).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(screen.getByRole("button", { name: "Save new date" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({
      monthlyContribution: 3334,
      targetDate: "2027-05-01",
      mode: "recalcMonthly",
    });
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

    expect(screen.getByTestId("savings-goal-target-month-month")).toBeDisabled();
    expect(screen.getByTestId("savings-goal-target-month-year")).toBeDisabled();
    expect(screen.getByTestId("savings-goal-target-month-quick-3")).toBeDisabled();
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
