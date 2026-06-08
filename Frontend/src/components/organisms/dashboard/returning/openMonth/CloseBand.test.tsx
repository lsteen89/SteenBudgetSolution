import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CloseBand from "./CloseBand";
import type {
  DashboardPeriodHeaderSummary,
  DashboardSummary,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

// Force a stable English locale so copy assertions stay deterministic.
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en-US",
}));

function buildHeader(
  overrides: Partial<DashboardPeriodHeaderSummary> = {},
): DashboardPeriodHeaderSummary {
  return {
    periodKey: "2026-06",
    periodLabel: "June 2026",
    periodDateRangeLabel: "1 Jun – 30 Jun",
    periodStatus: "open",
    previousPeriodLabel: null,
    nextPeriodLabel: null,
    previousPeriodKey: null,
    nextPeriodKey: null,
    canGoPrevious: false,
    canGoNext: false,
    canCloseMonth: false,
    closeMonthButtonLabel: null,
    lifecycleState: "normal",
    noticeText: null,
    closeEligibleAt: null,
    closeWindowOpensAt: null,
    ...overrides,
  };
}

function buildSummary(
  overrides: {
    header?: Partial<DashboardPeriodHeaderSummary>;
    finalBalance?: number;
  } = {},
): DashboardSummary {
  return {
    header: buildHeader(overrides.header),
    remainingToSpend: overrides.finalBalance ?? 1000,
    currency: "SEK",
    emergencyFundAmount: 0,
    emergencyFundMonths: 0,
    goalsProgressPercent: 0,
    totalIncome: 30000,
    totalExpenditure: 18000,
    incomingCarryOverAmount: 0,
    habitSavings: 0,
    goalSavings: 0,
    totalSavings: 5000,
    totalDebtPayments: 0,
    finalBalance: overrides.finalBalance ?? 1000,
    subscriptionsTotal: 0,
    subscriptionsCount: 0,
    subscriptions: [],
    pillarDescriptions: {
      income: "",
      expenditure: "",
      savings: "",
      debts: "",
    },
    recurringExpenses: [],
  };
}

const noneAvailability: CloseAvailability = { kind: "none" };
const readyAvailability: CloseAvailability = {
  kind: "ready",
  label: "Ready to close",
};
const countdownAvailability: CloseAvailability = {
  kind: "countdown",
  days: 3,
  label: "Closes in 3 days",
};

function renderBand(opts?: {
  summary?: DashboardSummary;
  closeAvailability?: CloseAvailability;
  onOpenCloseMonth?: () => void;
}) {
  const onOpenCloseMonth = opts?.onOpenCloseMonth ?? vi.fn();
  render(
    <CloseBand
      summary={opts?.summary ?? buildSummary()}
      closeAvailability={opts?.closeAvailability ?? noneAvailability}
      onOpenCloseMonth={onOpenCloseMonth}
    />,
  );
  return { onOpenCloseMonth };
}

describe("CloseBand — absent states", () => {
  it("renders nothing for a calm open month with no countdown", () => {
    renderBand();
    expect(screen.queryByTestId("close-band")).not.toBeInTheDocument();
  });

  it("renders nothing for a closed month even if backend allows close", () => {
    renderBand({
      summary: buildSummary({
        header: {
          periodStatus: "closed",
          lifecycleState: "eligible",
          canCloseMonth: true,
        },
      }),
      closeAvailability: readyAvailability,
    });
    expect(screen.queryByTestId("close-band")).not.toBeInTheDocument();
  });

  it("renders nothing for a skipped month", () => {
    renderBand({
      summary: buildSummary({
        header: { periodStatus: "skipped", canCloseMonth: true },
      }),
      closeAvailability: countdownAvailability,
    });
    expect(screen.queryByTestId("close-band")).not.toBeInTheDocument();
  });
});

describe("CloseBand — overdue", () => {
  it("renders the danger treatment with a CTA when overdue and backend allows close", () => {
    const { onOpenCloseMonth } = renderBand({
      summary: buildSummary({
        header: { lifecycleState: "overdue", canCloseMonth: true },
        finalBalance: 750,
      }),
      closeAvailability: readyAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-kind")).toBe("overdue");
    expect(band.getAttribute("data-carry-tone")).toBe("positive");

    const cta = screen.getByTestId("close-band-cta");
    fireEvent.click(cta);
    expect(onOpenCloseMonth).toHaveBeenCalledTimes(1);

    // No "disabled" hint when CTA is available.
    expect(
      screen.queryByTestId("close-band-disabled-hint"),
    ).not.toBeInTheDocument();
  });

  it("renders the danger treatment without a CTA when backend refuses close", () => {
    renderBand({
      summary: buildSummary({
        header: { lifecycleState: "overdue", canCloseMonth: false },
      }),
      closeAvailability: noneAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-kind")).toBe("overdue");
    expect(screen.queryByTestId("close-band-cta")).not.toBeInTheDocument();
    expect(screen.getByTestId("close-band-disabled-hint")).toBeInTheDocument();
  });
});

describe("CloseBand — eligible", () => {
  it("renders the accent treatment with CTA wired to onOpenCloseMonth", () => {
    const { onOpenCloseMonth } = renderBand({
      summary: buildSummary({
        header: { lifecycleState: "eligible", canCloseMonth: true },
        finalBalance: 1200.5,
      }),
      closeAvailability: readyAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-kind")).toBe("eligible");

    fireEvent.click(screen.getByTestId("close-band-cta"));
    expect(onOpenCloseMonth).toHaveBeenCalledTimes(1);
  });

  it("shows zero carry-forward with calm tone when remaining is zero", () => {
    renderBand({
      summary: buildSummary({
        header: { lifecycleState: "eligible", canCloseMonth: true },
        finalBalance: 0,
      }),
      closeAvailability: readyAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-carry-tone")).toBe("zero");
  });

  it("shows zero carry-forward with deficit tone when remaining is negative", () => {
    renderBand({
      summary: buildSummary({
        header: { lifecycleState: "eligible", canCloseMonth: true },
        finalBalance: -2300,
      }),
      closeAvailability: readyAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-kind")).toBe("eligible");
    expect(band.getAttribute("data-carry-tone")).toBe("deficit");
    // Preview itself must not show a negative number — closing a deficit
    // never pushes debt forward.
    const amount = screen.getByTestId("close-band-carry-amount");
    expect(amount.textContent ?? "").not.toMatch(/-|−/);
  });
});

describe("CloseBand — upcoming", () => {
  it("renders the quiet status with the existing countdown label and no CTA", () => {
    renderBand({
      summary: buildSummary({
        header: { lifecycleState: "upcoming", canCloseMonth: false },
      }),
      closeAvailability: countdownAvailability,
    });

    const band = screen.getByTestId("close-band");
    expect(band.getAttribute("data-kind")).toBe("upcoming");

    expect(
      screen.getByTestId("close-band-status-label").textContent,
    ).toContain("Closes in 3 days");

    expect(screen.queryByTestId("close-band-cta")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("close-band-disabled-hint"),
    ).not.toBeInTheDocument();
  });
});
