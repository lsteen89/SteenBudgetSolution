import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsBaseHabitDialog from "./SavingsBaseHabitDialog";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

describe("SavingsBaseHabitDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <SavingsBaseHabitDialog
        open={false}
        baseMonthly={5000}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(
      screen.queryByText(/adjust base savings/i),
    ).not.toBeInTheDocument();
  });

  it("shows the dialog with the three edit scopes when open", () => {
    render(
      <SavingsBaseHabitDialog
        open
        baseMonthly={5000}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/adjust base savings/i)).toBeInTheDocument();
    expect(
      screen.getByTestId("savings-base-habit-scope-currentMonthOnly"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(
        "savings-base-habit-scope-currentMonthAndBudgetPlan",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("savings-base-habit-scope-budgetPlanOnly"),
    ).toBeInTheDocument();
  });

  it("saves the parsed amount with the selected scope", async () => {
    const onSave = vi.fn();
    render(
      <SavingsBaseHabitDialog
        open
        baseMonthly={5000}
        monthLabel="May 2026"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave).toHaveBeenCalledWith({
      amountMonthly: 5000,
      scope: "currentMonthAndBudgetPlan",
    });
  });
});
