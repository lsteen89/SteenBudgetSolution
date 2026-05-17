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
  hasPlannedMarker: true,
  nextMilestone: null,
};

describe("SavingsSoulHero", () => {
  it("renders the monthly savings amount in the headline", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={baseAggregate}
        readOnly={false}
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /you're saving/i,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/4[\s,.]?000/);
  });

  it("names the next projected goal when available", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={{
          ...baseAggregate,
          nextMilestone: { goalName: "Vacation Fund", months: 15 },
        }}
        readOnly={false}
      />,
    );

    expect(
      screen.getByText(/Vacation Fund hits its target in about 15 months/i),
    ).toBeInTheDocument();
  });

  it("omits the next-milestone line when projection is unknown", () => {
    render(
      <SavingsSoulHero
        periodLabel="May 2026"
        aggregate={{ ...baseAggregate, nextMilestone: null }}
        readOnly={false}
      />,
    );

    expect(screen.queryByText(/hits its target in about/i)).not.toBeInTheDocument();
  });

  it("shows the read-only badge for closed months", () => {
    render(
      <SavingsSoulHero
        periodLabel="Apr 2026"
        aggregate={baseAggregate}
        readOnly
      />,
    );

    expect(screen.getByText(/closed month/i)).toBeInTheDocument();
  });
});
