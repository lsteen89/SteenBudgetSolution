import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SelectedMonthBanner from "./SelectedMonthBanner";

// Locale is fixed to English so the assertions can read the resolved copy
// directly. `ymLabel` runs for real: "2026-06" → "June 2026".
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

describe("SelectedMonthBanner", () => {
  it("renders nothing for the everyday case (editing the open month)", () => {
    const { container } = render(
      <SelectedMonthBanner
        yearMonth="2026-05"
        status="open"
        isOffOpenMonth={false}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("names the planned month and frames it as editing ahead of time", () => {
    render(
      <SelectedMonthBanner
        yearMonth="2026-06"
        status="planned"
        isOffOpenMonth
      />,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveAttribute("data-month-status", "planned");
    // The selected planned month is named explicitly and is not editable yet
    // by mistake — the copy says it applies when the month starts.
    expect(banner).toHaveTextContent(/June 2026/);
    expect(banner).toHaveTextContent(/ahead of time/i);
    // DoD: never imply the current open month is the one being edited.
    expect(banner).not.toHaveTextContent(/current month/i);
  });

  it("marks a closed month as read-only and names it", () => {
    render(
      <SelectedMonthBanner
        yearMonth="2026-04"
        status="closed"
        isOffOpenMonth
      />,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveAttribute("data-month-status", "closed");
    expect(banner).toHaveTextContent(/April 2026/);
    expect(banner).toHaveTextContent(/closed and cannot be changed/i);
    expect(banner).not.toHaveTextContent(/current month/i);
  });

  it("marks a skipped month as read-only and names it", () => {
    render(
      <SelectedMonthBanner
        yearMonth="2026-03"
        status="skipped"
        isOffOpenMonth
      />,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveAttribute("data-month-status", "skipped");
    expect(banner).toHaveTextContent(/March 2026/);
    expect(banner).toHaveTextContent(/skipped and cannot be changed/i);
  });

  it("explains an open-but-off-open selection without saying current month", () => {
    render(
      <SelectedMonthBanner
        yearMonth="2026-07"
        status="open"
        isOffOpenMonth
      />,
    );

    const banner = screen.getByTestId("selected-month-banner");
    expect(banner).toHaveTextContent(/July 2026/);
    expect(banner).toHaveTextContent(/not your active month/i);
    expect(banner).not.toHaveTextContent(/current month/i);
  });
});
