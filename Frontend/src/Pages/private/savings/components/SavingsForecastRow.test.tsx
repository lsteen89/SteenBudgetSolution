import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SavingsForecastRow from "./SavingsForecastRow";

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

describe("SavingsForecastRow", () => {
  it("renders six projected month columns", () => {
    render(
      <SavingsForecastRow
        referenceDate={new Date(2026, 4, 1)}
        totalSaved={146420}
        monthlyContribution={8750}
      />,
    );

    expect(screen.getByTestId("savings-forecast-row")).toBeInTheDocument();
    expect(screen.getAllByTestId("savings-forecast-column")).toHaveLength(6);
  });

  it("marks the first column as the current month", () => {
    render(
      <SavingsForecastRow
        referenceDate={new Date(2026, 4, 1)}
        totalSaved={146420}
        monthlyContribution={8750}
      />,
    );

    const columns = screen.getAllByTestId("savings-forecast-column");
    expect(columns[0].dataset.now).toBe("true");
    expect(columns[5].dataset.now).toBeUndefined();
  });

  it("renders nothing without a positive monthly plan", () => {
    render(
      <SavingsForecastRow
        referenceDate={new Date(2026, 4, 1)}
        totalSaved={146420}
        monthlyContribution={0}
      />,
    );

    expect(
      screen.queryByTestId("savings-forecast-row"),
    ).not.toBeInTheDocument();
  });
});
