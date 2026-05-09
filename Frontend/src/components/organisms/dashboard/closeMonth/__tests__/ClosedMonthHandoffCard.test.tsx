import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ClosedMonthHandoffCard, {
  type ClosedMonthHandoffCardProps,
} from "../ClosedMonthHandoffCard";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

const baseProps: ClosedMonthHandoffCardProps = {
  closedMonthLabel: "April 2026",
  nextMonthLabel: "May 2026",
  finalBalance: 0,
  carryOverMode: "none",
  carryOverAmount: 0,
  currency: "SEK",
  onContinue: vi.fn(),
};

function renderCard(overrides: Partial<ClosedMonthHandoffCardProps> = {}) {
  const onContinue = overrides.onContinue ?? vi.fn();
  const onDismiss = overrides.onDismiss;
  const utils = render(
    <ClosedMonthHandoffCard
      {...baseProps}
      {...overrides}
      onContinue={onContinue}
      onDismiss={onDismiss}
    />,
  );
  return { ...utils, onContinue, onDismiss };
}

describe("ClosedMonthHandoffCard", () => {
  it("renders the positive carried-forward variant when carry-over mode is full", () => {
    renderCard({
      finalBalance: 950,
      carryOverMode: "full",
      carryOverAmount: 950,
    });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card).toHaveAttribute("data-variant", "positiveFull");
    expect(within(card).getByTestId("closed-month-handoff-title")).toHaveTextContent(
      "April 2026 is closed",
    );
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /carried over to May 2026/i,
    );
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /950/,
    );
    expect(within(card).getByTestId("closed-month-handoff-continue")).toHaveTextContent(
      "Continue to May 2026",
    );
  });

  it("renders the positive kept variant when carry-over mode is none and balance is positive", () => {
    renderCard({
      finalBalance: 950,
      carryOverMode: "none",
      carryOverAmount: 0,
    });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card).toHaveAttribute("data-variant", "positiveKept");
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /kept as a surplus in April 2026/i,
    );
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /950/,
    );
  });

  it("renders the balanced variant when the final balance is exactly zero", () => {
    renderCard({ finalBalance: 0, carryOverMode: "none", carryOverAmount: 0 });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card).toHaveAttribute("data-variant", "balanced");
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /the month is closed and saved as a historical summary/i,
    );
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /April 2026/,
    );
    expect(within(card).getByTestId("closed-month-handoff-body")).toHaveTextContent(
      /May 2026/,
    );
  });

  it("renders supportive deficit copy without shame language", () => {
    renderCard({ finalBalance: -750, carryOverMode: "none", carryOverAmount: 0 });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card).toHaveAttribute("data-variant", "deficit");

    const body = within(card).getByTestId("closed-month-handoff-body");
    expect(body).toHaveTextContent(/-?750/);
    expect(body).toHaveTextContent(/insights/i);
    expect(body).toHaveTextContent(/next plan/i);

    // Calm-copy guard: no shame, blame, or "failure" language.
    const text = body.textContent ?? "";
    expect(text).not.toMatch(
      /shame|blame|fail(ed|ure)?|bad|overspent|you went/i,
    );
  });

  it("invokes onContinue when the primary CTA is clicked", () => {
    const { onContinue } = renderCard({ finalBalance: 0 });

    fireEvent.click(screen.getByTestId("closed-month-handoff-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("renders a dismiss button only when onDismiss is provided", () => {
    const onDismiss = vi.fn();
    const { rerender } = renderCard({});
    expect(
      screen.queryByTestId("closed-month-handoff-dismiss"),
    ).not.toBeInTheDocument();

    rerender(
      <ClosedMonthHandoffCard {...baseProps} onDismiss={onDismiss} />,
    );

    fireEvent.click(screen.getByTestId("closed-month-handoff-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("treats a near-zero final balance as balanced (rounding tolerance)", () => {
    renderCard({ finalBalance: 0.001, carryOverMode: "none" });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card).toHaveAttribute("data-variant", "balanced");
  });
});
