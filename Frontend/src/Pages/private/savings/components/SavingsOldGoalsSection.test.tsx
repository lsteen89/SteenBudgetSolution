import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalArchiveRowDto } from "@/types/budget/BudgetMonthSavingsGoalArchiveRowDto";
import SavingsOldGoalsSection from "./SavingsOldGoalsSection";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const completedRow: BudgetMonthSavingsGoalArchiveRowDto = {
  id: "11111111-1111-4111-8111-111111111111",
  sourceSavingsGoalId: "22222222-2222-4222-8222-222222222222",
  name: "Emergency fund",
  targetAmount: 120000,
  targetDate: "2026-12-31",
  amountSavedAtClose: 120000,
  monthlyContribution: 0,
  status: "closed",
  closedReason: "completed",
  closedAt: "2026-04-30T12:00:00Z",
  isMonthOnly: false,
};

const cancelledRow: BudgetMonthSavingsGoalArchiveRowDto = {
  id: "33333333-3333-4333-8333-333333333333",
  sourceSavingsGoalId: null,
  name: "Vacation fund",
  targetAmount: 36000,
  targetDate: null,
  amountSavedAtClose: 21800,
  monthlyContribution: 0,
  status: "closed",
  closedReason: "cancelled",
  closedAt: "2026-03-15T09:00:00Z",
  isMonthOnly: true,
};

describe("SavingsOldGoalsSection", () => {
  it("renders nothing when there are no old goals", () => {
    const { container } = render(<SavingsOldGoalsSection rows={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the title with count and is collapsed by default", () => {
    render(<SavingsOldGoalsSection rows={[completedRow, cancelledRow]} />);

    const section = screen.getByTestId("savings-old-goals-section");
    expect(section.dataset.state).toBe("collapsed");
    expect(screen.getByTestId("savings-old-goals-count")).toHaveTextContent(
      "(2)",
    );
    // List is not rendered while collapsed.
    expect(
      screen.queryByTestId("savings-old-goals-list"),
    ).not.toBeInTheDocument();
  });

  it("expands on click and renders one row per goal with status badges", async () => {
    const user = userEvent.setup();
    render(<SavingsOldGoalsSection rows={[completedRow, cancelledRow]} />);

    await user.click(screen.getByTestId("savings-old-goals-toggle"));

    const section = screen.getByTestId("savings-old-goals-section");
    expect(section.dataset.state).toBe("expanded");
    const rows = screen.getAllByTestId("savings-old-goal-row");
    expect(rows).toHaveLength(2);

    // Completed row carries the completed reason marker and label.
    expect(rows[0].dataset.closedReason).toBe("completed");
    expect(rows[0]).toHaveTextContent(/Emergency fund/);
    expect(rows[0]).toHaveTextContent(/Completed/);

    // Cancelled row uses the "Ended" copy, not any shame language.
    expect(rows[1].dataset.closedReason).toBe("cancelled");
    expect(rows[1]).toHaveTextContent(/Vacation fund/);
    expect(rows[1]).toHaveTextContent(/Ended/);
    expect(rows[1]).not.toHaveTextContent(/failed|gave up/i);
  });

  it("never renders the active 'Adjust' affordance or lifecycle menus", async () => {
    const user = userEvent.setup();
    render(<SavingsOldGoalsSection rows={[completedRow, cancelledRow]} />);
    await user.click(screen.getByTestId("savings-old-goals-toggle"));

    // The active cards expose a button labelled "Adjust" and a row-actions
    // menu; the archive must never surface either.
    expect(
      screen.queryByRole("button", { name: /adjust/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("budget-editor-row-actions-trigger"),
    ).not.toBeInTheDocument();
  });
});
