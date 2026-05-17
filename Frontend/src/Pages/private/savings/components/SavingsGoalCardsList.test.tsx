import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import SavingsGoalCardsList from "./SavingsGoalCardsList";
import {
  aggregateSavingsHero,
  getMonthStartDate,
} from "../utils/savingsSoul";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const REFERENCE = getMonthStartDate("2026-05");

const baseRow: BudgetMonthSavingsGoalEditorRowDto = {
  id: "row-1",
  sourceSavingsGoalId: "src-1",
  name: "Iceland trip",
  targetAmount: 35000,
  targetDate: "2027-09-30",
  amountSaved: 22400,
  monthlyContribution: 4200,
  status: "active",
  isDeleted: false,
  isMonthOnly: false,
  canUpdateDefault: true,
};

const buildRows = (count: number): BudgetMonthSavingsGoalEditorRowDto[] =>
  Array.from({ length: count }, (_, index) => ({
    ...baseRow,
    id: `row-${index + 1}`,
    sourceSavingsGoalId: `src-${index + 1}`,
    name: `Goal ${index + 1}`,
  }));

describe("SavingsGoalCardsList", () => {
  it("renders the planned-marker legend when at least one goal has a plan", () => {
    render(
      <SavingsGoalCardsList
        rows={[baseRow]}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend
        onEdit={vi.fn()}
      />,
    );

    const legend = screen.getByTestId("savings-progress-legend");
    expect(legend).toHaveTextContent(/saved so far/i);
    expect(legend).toHaveTextContent(/planned level/i);
    expect(legend).toHaveTextContent(/the marker shows/i);
  });

  it("hides the legend when no goal has a planned marker", () => {
    render(
      <SavingsGoalCardsList
        rows={[baseRow]}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend={false}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("savings-progress-legend")).not.toBeInTheDocument();
  });

  it("renders many goals without breaking and switches to compact density at 5+", () => {
    render(
      <SavingsGoalCardsList
        rows={buildRows(8)}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend
        onEdit={vi.fn()}
      />,
    );

    const cards = screen.getAllByTestId("savings-goal-card");
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      expect(card.dataset.density).toBe("compact");
    }
  });

  it("uses regular density for 1-4 goals", () => {
    render(
      <SavingsGoalCardsList
        rows={buildRows(4)}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend
        onEdit={vi.fn()}
      />,
    );

    const cards = screen.getAllByTestId("savings-goal-card");
    expect(cards).toHaveLength(4);
    for (const card of cards) {
      expect(card.dataset.density).toBe("regular");
    }
  });

  it("legend visibility tracks the aggregate's hasPlannedMarker (on-pace = no legend, no card marker)", () => {
    const onPaceRow: BudgetMonthSavingsGoalEditorRowDto = {
      ...baseRow,
      id: "on-pace",
      targetAmount: 12000,
      targetDate: "2027-05-01",
      amountSaved: 0,
      monthlyContribution: 1000,
    };

    const aggregate = aggregateSavingsHero([onPaceRow], REFERENCE);
    expect(aggregate.hasPlannedMarker).toBe(false);

    render(
      <SavingsGoalCardsList
        rows={[onPaceRow]}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend={aggregate.hasPlannedMarker}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.queryByTestId("savings-progress-legend")).not.toBeInTheDocument();
  });

  it("legend renders when the aggregate detects a meaningful divergence (ahead goal)", () => {
    const aheadRow: BudgetMonthSavingsGoalEditorRowDto = {
      ...baseRow,
      id: "ahead",
      targetAmount: 12000,
      targetDate: "2027-05-01",
      amountSaved: 10000,
      monthlyContribution: 1000,
    };

    const aggregate = aggregateSavingsHero([aheadRow], REFERENCE);
    expect(aggregate.hasPlannedMarker).toBe(true);

    render(
      <SavingsGoalCardsList
        rows={[aheadRow]}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend={aggregate.hasPlannedMarker}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("savings-progress-legend")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    render(
      <SavingsGoalCardsList
        rows={[]}
        readOnly={false}
        referenceDate={REFERENCE}
        showPlannedMarkerLegend
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByTestId("savings-goal-cards-empty")).toBeInTheDocument();
  });
});
