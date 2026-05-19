import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
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

const renderList = (
  override: Partial<React.ComponentProps<typeof SavingsGoalCardsList>>,
) => {
  const defaults: React.ComponentProps<typeof SavingsGoalCardsList> = {
    rows: [baseRow],
    readOnly: false,
    referenceDate: REFERENCE,
    showPlannedMarkerLegend: true,
    onEdit: vi.fn(),
    draftOpen: false,
    onOpenDraft: vi.fn(),
    onCancelDraft: vi.fn(),
    onSubmitDraft: vi.fn(),
  };
  return render(<SavingsGoalCardsList {...defaults} {...override} />);
};

describe("SavingsGoalCardsList", () => {
  it("renders the planned-marker legend when at least one goal has a plan", () => {
    renderList({ rows: [baseRow], showPlannedMarkerLegend: true });

    const legend = screen.getByTestId("savings-progress-legend");
    expect(legend).toHaveTextContent(/saved so far/i);
    expect(legend).toHaveTextContent(/planned level/i);
    expect(legend).toHaveTextContent(/the marker shows/i);
  });

  it("hides the legend when no goal has a planned marker", () => {
    renderList({ rows: [baseRow], showPlannedMarkerLegend: false });

    expect(screen.queryByTestId("savings-progress-legend")).not.toBeInTheDocument();
  });

  it("renders many goals without breaking and switches to compact density at 5+", () => {
    renderList({ rows: buildRows(8) });

    const cards = screen.getAllByTestId("savings-goal-card");
    expect(cards).toHaveLength(8);
    for (const card of cards) {
      expect(card.dataset.density).toBe("compact");
    }
  });

  it("uses regular density for 1-4 goals", () => {
    renderList({ rows: buildRows(4) });

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

    renderList({
      rows: [onPaceRow],
      showPlannedMarkerLegend: aggregate.hasPlannedMarker,
    });

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

    renderList({
      rows: [aheadRow],
      showPlannedMarkerLegend: aggregate.hasPlannedMarker,
    });

    expect(screen.getByTestId("savings-progress-legend")).toBeInTheDocument();
  });

  it("renders an empty state when there are no rows", () => {
    renderList({ rows: [] });

    expect(screen.getByTestId("savings-goal-cards-empty")).toBeInTheDocument();
  });

  it("renders an enabled add placeholder for an open month", () => {
    renderList({ rows: [] });

    const placeholder = screen.getByTestId("savings-goal-add-placeholder");
    expect(placeholder.getAttribute("data-state")).toBe("ready");
    expect(placeholder).not.toBeDisabled();
  });

  it("renders a disabled add placeholder when read-only (closed/skipped month)", () => {
    renderList({ rows: [], readOnly: true });

    const placeholder = screen.getByTestId("savings-goal-add-placeholder");
    expect(placeholder.getAttribute("data-state")).toBe("disabled");
    expect(placeholder).toBeDisabled();
  });

  it("invokes onOpenDraft when the placeholder is clicked", () => {
    const onOpenDraft = vi.fn();
    renderList({ rows: [], onOpenDraft });

    fireEvent.click(screen.getByTestId("savings-goal-add-placeholder"));
    expect(onOpenDraft).toHaveBeenCalledTimes(1);
  });

  it("renders the draft card and hides the placeholder when draftOpen is true", () => {
    renderList({ rows: [], draftOpen: true });

    expect(screen.getByTestId("savings-goal-draft-card")).toBeInTheDocument();
    expect(screen.queryByTestId("savings-goal-add-placeholder")).not.toBeInTheDocument();
  });
});
