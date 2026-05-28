import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsSoulHero from "./SavingsSoulHero";
import type { SavingsHeroAggregate } from "../utils/savingsSoul";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));
vi.mock("@/hooks/i18n/useAppCurrency", () => ({
  useAppCurrency: () => "SEK",
}));

const baseAggregate: SavingsHeroAggregate = {
  totalMonthly: 4000,
  totalSaved: 122000,
  totalTarget: 200000,
  goalCount: 3,
  aheadCount: 0,
  behindCount: 0,
  aheadGoalNames: [],
  behindGoalNames: [],
  hasPlannedMarker: true,
  nextMilestone: null,
};

describe("SavingsSoulHero", () => {
  it("headlines the combined base + goal monthly total", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={baseAggregate}
        baseMonthly={3000}
        readOnly={false}
      />,
    );

    // 3000 base + 4000 goals = 7000
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /you're saving/i,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /7[\s,.]?000/,
    );
  });

  it("makes the base-vs-goals split explicit in the subtitle", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={baseAggregate}
        baseMonthly={3000}
        readOnly={false}
      />,
    );

    const split = screen.getByTestId("savings-hero-split");
    expect(split).toHaveTextContent(/3[\s,.]?000/);
    expect(split).toHaveTextContent(/as a habit/i);
    expect(split).toHaveTextContent(/across 3 goals/i);
    expect(split).toHaveTextContent(/saved so far/i);
  });

  it("shows the funded percentage pill from saved vs target", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={baseAggregate}
        baseMonthly={3000}
        readOnly={false}
      />,
    );

    // 122000 / 200000 = 61%
    expect(
      screen.getByTestId("savings-hero-funded-pill"),
    ).toHaveTextContent(/saved so far: 61% of target amounts/i);
  });

  it("names the goal that needs adjusting", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={{
          ...baseAggregate,
          aheadCount: 0,
          behindCount: 1,
          behindGoalNames: ["Emergency buffer"],
        }}
        baseMonthly={3000}
        readOnly={false}
      />,
    );

    expect(screen.getByText(/emergency buffer needs adjusting/i)).toBeInTheDocument();
  });

  it("omits the funded pill when there is no target to fund", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={{
          ...baseAggregate,
          goalCount: 0,
          totalMonthly: 0,
          totalSaved: 0,
          totalTarget: 0,
        }}
        baseMonthly={3000}
        readOnly={false}
      />,
    );

    expect(
      screen.queryByTestId("savings-hero-funded-pill"),
    ).not.toBeInTheDocument();
  });

  it("shows the read-only badge for closed months", () => {
    render(
      <SavingsSoulHero
        periodLabel="Apr 2026"
        aggregate={baseAggregate}
        baseMonthly={3000}
        readOnly
      />,
    );

    expect(screen.getByText(/closed month/i)).toBeInTheDocument();
  });
});
