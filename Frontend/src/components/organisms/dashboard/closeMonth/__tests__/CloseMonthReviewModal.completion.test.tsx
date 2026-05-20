import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CloseMonthReviewModal from "../CloseMonthReviewModal";
import type { SavingsGoalCompletionCandidateDto } from "@/types/budget/SavingsGoalCompletionCandidateDto";
import type {
  CloseMonthReviewState,
  CloseMonthSummary,
} from "@/hooks/dashboard/closeMonth.types";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

const baseReviewState: CloseMonthReviewState = {
  state: "balanced",
  normalizedRemainingToSpend: 0,
};

const baseSummary: CloseMonthSummary = {
  incomingCarryOver: 0,
  income: 30000,
  expenses: 20000,
  savingsAndDebt: 10000,
  remaining: 0,
};

function renderModal(
  overrides: Partial<React.ComponentProps<typeof CloseMonthReviewModal>> = {},
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const onSelectCarryOverMode = vi.fn();
  const onToggleCompletionGoal = vi.fn();

  const utils = render(
    <CloseMonthReviewModal
      open={true}
      periodLabel="April 2026"
      periodMonthOnlyLabel="April"
      nextPeriodLabel="May 2026"
      currency="SEK"
      reviewState={baseReviewState}
      summary={baseSummary}
      selectedCarryOverMode="none"
      isSubmitting={false}
      onClose={onClose}
      onConfirm={onConfirm}
      onSelectCarryOverMode={onSelectCarryOverMode}
      onToggleCompletionGoal={onToggleCompletionGoal}
      {...overrides}
    />,
  );

  return { ...utils, onClose, onConfirm, onToggleCompletionGoal };
}

const candidateA: SavingsGoalCompletionCandidateDto = {
  id: "goal-a",
  sourceSavingsGoalId: "src-a",
  name: "Buffert",
  targetAmount: 10000,
  amountSaved: 9500,
  monthlyContribution: 500,
  projectedAmountSaved: 10000,
  remainingAfterContribution: 0,
};

const candidateB: SavingsGoalCompletionCandidateDto = {
  id: "goal-b",
  sourceSavingsGoalId: null,
  name: "Resa",
  targetAmount: 4000,
  amountSaved: 3800,
  monthlyContribution: 250,
  projectedAmountSaved: 4050,
  remainingAfterContribution: -50,
};

describe("CloseMonthReviewModal — savings goal completion candidates", () => {
  it("renders the candidate section when candidates exist", () => {
    renderModal({
      completionCandidates: [candidateA, candidateB],
      selectedCompletionGoalIds: new Set<string>(),
    });

    const section = screen.getByTestId("close-month-completion-candidates");
    expect(section).toBeInTheDocument();
    expect(
      screen.getByTestId(`close-month-completion-candidate-${candidateA.id}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`close-month-completion-candidate-${candidateB.id}`),
    ).toBeInTheDocument();
  });

  it("renders candidate checkboxes unchecked by default", () => {
    renderModal({
      completionCandidates: [candidateA, candidateB],
      selectedCompletionGoalIds: new Set<string>(),
    });

    const cbA = screen.getByTestId(
      `close-month-completion-checkbox-${candidateA.id}`,
    ) as HTMLInputElement;
    const cbB = screen.getByTestId(
      `close-month-completion-checkbox-${candidateB.id}`,
    ) as HTMLInputElement;

    expect(cbA.checked).toBe(false);
    expect(cbB.checked).toBe(false);
  });

  it("hides the candidate section when there are no candidates", () => {
    renderModal({
      completionCandidates: [],
      selectedCompletionGoalIds: new Set<string>(),
    });

    expect(
      screen.queryByTestId("close-month-completion-candidates"),
    ).not.toBeInTheDocument();
  });

  it("invokes the toggle handler with the candidate id when checkbox is clicked", () => {
    const { onToggleCompletionGoal } = renderModal({
      completionCandidates: [candidateA],
      selectedCompletionGoalIds: new Set<string>(),
    });

    const cb = screen.getByTestId(
      `close-month-completion-checkbox-${candidateA.id}`,
    );
    fireEvent.click(cb);
    expect(onToggleCompletionGoal).toHaveBeenCalledWith(candidateA.id);
  });
});
