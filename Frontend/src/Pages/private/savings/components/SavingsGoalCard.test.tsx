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

describe("SavingsGoalCard", () => {
  it("keeps a visible Adjust action on desktop and fires onEdit", () => {
    const onEdit = vi.fn();
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        onEdit={onEdit}
      />,
    );

    const adjust = screen.getByRole("button", { name: "Adjust" });
    expect(adjust).toBeInTheDocument();
    fireEvent.click(adjust);
    expect(onEdit).toHaveBeenCalledWith(onTrackRow);
  });

  it("disables the Adjust action in read-only mode", () => {
    const onEdit = vi.fn();
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly
        referenceDate={REFERENCE}
        onEdit={onEdit}
      />,
    );

    const adjust = screen.getByRole("button", { name: "Adjust" });
    expect(adjust).toBeDisabled();
    fireEvent.click(adjust);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("renders a calm 'Ongoing' status for goals without a target date", () => {
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        onEdit={vi.fn()}
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
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("Ahead of plan")).toBeInTheDocument();
  });

  it("renders a compact card when density='compact'", () => {
    render(
      <SavingsGoalCard
        row={onTrackRow}
        readOnly={false}
        referenceDate={REFERENCE}
        density="compact"
        onEdit={vi.fn()}
      />,
    );

    const card = screen.getByTestId("savings-goal-card");
    expect(card.dataset.density).toBe("compact");
  });
});
