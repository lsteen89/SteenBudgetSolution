import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalCard from "./SavingsGoalCard";
import { getMonthStartDate } from "../utils/savingsSoul";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const REFERENCE = getMonthStartDate("2026-05");

const onTrackRow: BudgetMonthSavingsGoalEditorRowDto = {
  id: "row-1",
  sourceSavingsGoalId: "src-1",
  name: "Emergency fund",
  targetAmount: 60000,
  targetDate: null,
  amountSaved: 22100,
  monthlyContribution: 3000,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

const aheadRow: BudgetMonthSavingsGoalEditorRowDto = {
  id: "row-2",
  sourceSavingsGoalId: "src-2",
  name: "Iceland trip",
  targetAmount: 35000,
  // Far enough out that the saved amount is well ahead of the linear plan.
  targetDate: "2099-01-01",
  amountSaved: 22400,
  monthlyContribution: 100,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

const actionProps = {
  onDeposit: vi.fn(),
  onMonthly: vi.fn(),
  onTargetDate: vi.fn(),
  onRename: vi.fn(),
  onChangeTarget: vi.fn(),
  onArchive: vi.fn(),
  onRemove: vi.fn(),
};

describe("SavingsGoalCard", () => {
  it("renders the V2 action row and fires the monthly action", () => {
    const onMonthly = vi.fn();
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        {...actionProps}
        onMonthly={onMonthly}
      />,
    );

    expect(screen.getByTestId("savings-goal-action-row")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Adjust" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Monthly amount" }));
    expect(onMonthly).toHaveBeenCalledWith(onTrackRow);
  });

  it("disables action chips in read-only mode", () => {
    const onMonthly = vi.fn();
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly
        referenceDate={REFERENCE}
        {...actionProps}
        onMonthly={onMonthly}
      />,
    );

    const monthly = screen.getByRole("button", { name: "Monthly amount" });
    expect(monthly).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(monthly);
    expect(onMonthly).not.toHaveBeenCalled();
  });

  it("renders a calm 'Ongoing' status for goals without a target date", () => {
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        {...actionProps}
      />,
    );

    expect(screen.getByText("Ongoing")).toBeInTheDocument();
  });

  it("renders a non-shaming 'Ahead of plan' status when pace beats expectations", () => {
    render(
      <SavingsGoalCard
        row={aheadRow}
        readOnly={false}
        referenceDate={REFERENCE}
        {...actionProps}
      />,
    );

    expect(screen.getByText("Ahead of plan")).toBeInTheDocument();
  });

  it("renders stored decimal monthly contributions without truncation", () => {
    render(
      <SavingsGoalCard
        row={{ ...onTrackRow, monthlyContribution: 1234.56 }}
        readOnly={false}
        referenceDate={REFERENCE}
        {...actionProps}
      />,
    );

    // Decimal precision survives onto both the headline and the pace line.
    expect(screen.getAllByText(/1,234\.56/).length).toBeGreaterThan(0);
  });

  it("renders whole-krona contributions without trailing decimals", () => {
    render(
      <SavingsGoalCard
        row={{ ...onTrackRow, monthlyContribution: 3000 }}
        readOnly={false}
        referenceDate={REFERENCE}
        {...actionProps}
      />,
    );

    expect(screen.queryByText(/3,000\.00/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/3,000/).length).toBeGreaterThan(0);
  });

  it("renders a compact card when density='compact'", () => {
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        density="compact"
        {...actionProps}
      />,
    );

    const card = screen.getByTestId("savings-goal-card");
    expect(card.dataset.density).toBe("compact");
  });
});
