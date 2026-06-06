import { act, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import CloseMonthReviewModal from "../CloseMonthReviewModal";
import type {
  CloseMonthReviewState,
  CloseMonthSummary,
} from "@/hooks/dashboard/closeMonth.types";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

// `useReducedMotion` is the one knob the modal reads to gate the halo,
// mascot float, and count-up. Exposing it as a let-binding lets each test
// drive the motion path without a per-test vi.doMock dance.
let reducedMotionFlag = false;

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => reducedMotionFlag,
  };
});

// Same trick for the locale so we can prove the year strip localizes its
// own labels (the previous implementation leaked Swedish abbreviations into
// every locale).
let mockedLocale: "sv" | "en" | "et" = "en";
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => mockedLocale,
}));

const positiveSummary: CloseMonthSummary = {
  incomingCarryOver: 0,
  income: 70020,
  expenses: 59535,
  savingsAndDebt: 10000,
  remaining: 1240.5,
};

const deficitSummary: CloseMonthSummary = {
  incomingCarryOver: 0,
  income: 20000,
  expenses: 22500,
  savingsAndDebt: 0,
  remaining: -2500,
};

const balancedSummary: CloseMonthSummary = {
  incomingCarryOver: 0,
  income: 30000,
  expenses: 20000,
  savingsAndDebt: 10000,
  remaining: 0,
};

const positiveState: CloseMonthReviewState = {
  state: "positiveRemaining",
  normalizedRemainingToSpend: 1240.5,
};

const deficitState: CloseMonthReviewState = {
  state: "negativeRemaining",
  normalizedRemainingToSpend: -2500,
};

const balancedState: CloseMonthReviewState = {
  state: "balanced",
  normalizedRemainingToSpend: 0,
};

function renderModal(
  overrides: Partial<React.ComponentProps<typeof CloseMonthReviewModal>> = {},
) {
  const noop = () => undefined;
  return render(
    <CloseMonthReviewModal
      open
      periodLabel="April 2026"
      periodMonthOnlyLabel="April"
      nextPeriodLabel="May 2026"
      currency="SEK"
      reviewState={positiveState}
      summary={positiveSummary}
      selectedCarryOverMode="full"
      onClose={noop}
      onConfirm={noop}
      onSelectCarryOverMode={noop}
      closedMonthsInYear={3}
      yearMonthList={Array.from(
        { length: 12 },
        (_, idx) => `2026-${String(idx + 1).padStart(2, "0")}`,
      )}
      {...overrides}
    />,
  );
}

function getHeroAmount() {
  return screen.getByTestId("close-month-hero-amount");
}

function queryHalo(): Element | null {
  return document.querySelector(".cm-hero-halo");
}

function queryMascot(): HTMLImageElement | null {
  // The mascot has alt="" + role-less img; the simplest selector is the
  // float class (always present in positive variants, with or without the
  // animation class depending on reduce-motion).
  return document.querySelector(
    'img[src*="CalcBird"]',
  ) as HTMLImageElement | null;
}

beforeEach(() => {
  reducedMotionFlag = false;
  mockedLocale = "en";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CloseMonthReviewModal — chapter ribbon", () => {
  it("substitutes the chapter number from closedMonthsInYear (en)", () => {
    renderModal({ closedMonthsInYear: 3 });

    const kicker = screen.getByTestId("close-month-chapter-kicker");
    expect(kicker.textContent).toBe("Monthly close · chapter 4 of 12");
  });

  it("localizes year-strip labels per app locale", () => {
    mockedLocale = "sv";
    renderModal({
      closedMonthsInYear: 3,
      yearMonthList: Array.from(
        { length: 12 },
        (_, idx) => `2026-${String(idx + 1).padStart(2, "0")}`,
      ),
    });

    const strip = screen.getByTestId("close-month-year-strip");
    // Swedish Intl short month for May is "maj" (lowercase). English would
    // be "May". Asserting the locale-specific differentiator is enough to
    // prove labels actually come from Intl, not the old SV constant.
    const labels = within(strip)
      .getAllByText((_, el) => el?.tagName === "SPAN")
      .map((node) => node.textContent?.toLowerCase() ?? "");
    expect(labels).toContain("maj");
  });

  it("renders an English short month label when locale is en", () => {
    mockedLocale = "en";
    renderModal({
      closedMonthsInYear: 3,
      yearMonthList: Array.from(
        { length: 12 },
        (_, idx) => `2026-${String(idx + 1).padStart(2, "0")}`,
      ),
    });

    const strip = screen.getByTestId("close-month-year-strip");
    const labels = within(strip)
      .getAllByText((_, el) => el?.tagName === "SPAN")
      .map((node) => node.textContent?.toLowerCase() ?? "");
    // English short for May is "may", not "maj".
    expect(labels).toContain("may");
    expect(labels).not.toContain("maj");
  });
});

describe("CloseMonthReviewModal — variants", () => {
  it("positiveFull: hero present, halo + floating mascot rendered, carry-over selected", () => {
    renderModal({
      reviewState: positiveState,
      summary: positiveSummary,
      selectedCarryOverMode: "full",
    });

    const hero = screen.getByTestId("close-month-hero");
    expect(hero.getAttribute("data-variant")).toBe("positive");
    expect(queryHalo()).not.toBeNull();
    const mascot = queryMascot();
    expect(mascot).not.toBeNull();
    expect(mascot!.className).toContain("cm-mascot-float");

    expect(screen.getByTestId("resolve-carry-over").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByTestId("resolve-keep").getAttribute("aria-checked")).toBe(
      "false",
    );
  });

  it("positiveKept: same hero, but keep is selected", () => {
    renderModal({
      reviewState: positiveState,
      summary: positiveSummary,
      selectedCarryOverMode: "none",
    });

    expect(screen.getByTestId("close-month-hero").getAttribute("data-variant")).toBe(
      "positive",
    );
    expect(screen.getByTestId("resolve-keep").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(
      screen.getByTestId("resolve-carry-over").getAttribute("aria-checked"),
    ).toBe("false");
  });

  it("balanced: no hero block, no decision cards", () => {
    renderModal({
      reviewState: balancedState,
      summary: balancedSummary,
      selectedCarryOverMode: "none",
    });

    expect(screen.queryByTestId("close-month-hero")).not.toBeInTheDocument();
    expect(screen.queryByTestId("close-month-hero-amount")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resolve-carry-over")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resolve-keep")).not.toBeInTheDocument();
  });

  it("deficit: rose negative hero, no halo, no mascot, no decision cards", () => {
    renderModal({
      reviewState: deficitState,
      summary: deficitSummary,
      selectedCarryOverMode: "none",
    });

    const hero = screen.getByTestId("close-month-hero");
    expect(hero.getAttribute("data-variant")).toBe("negative");

    const expectedAbs = formatMoneyV2(
      Math.abs(deficitState.normalizedRemainingToSpend),
      "SEK",
      "en",
    );
    const amount = getHeroAmount();
    // Visual + aria-label both lead with a minus sign for the deficit path.
    expect(amount.textContent?.startsWith("-")).toBe(true);
    expect(amount.textContent).toContain(expectedAbs);
    expect(amount.getAttribute("aria-label")).toBe(`-${expectedAbs}`);

    // No mascot, no halo, no decision cards in the deficit path.
    expect(queryHalo()).toBeNull();
    expect(queryMascot()).toBeNull();
    expect(screen.queryByTestId("resolve-carry-over")).not.toBeInTheDocument();
    expect(screen.queryByTestId("resolve-keep")).not.toBeInTheDocument();

    // Negative notice still surfaces for screen readers.
    expect(
      screen.getByTestId("close-month-negative-notice"),
    ).toBeInTheDocument();
  });
});

describe("CloseMonthReviewModal — reduced motion", () => {
  beforeEach(() => {
    reducedMotionFlag = true;
  });

  it("flags the dialog with data-reduce-motion and snaps the hero amount to the settled value", () => {
    renderModal({
      reviewState: positiveState,
      summary: positiveSummary,
    });

    const dialog = screen.getByTestId("close-month-modal");
    expect(dialog.getAttribute("data-reduce-motion")).toBe("true");

    // The hook initialises value=target when reduced motion is on, so the
    // initial render already shows the settled amount — both visually and
    // in the aria-label.
    const expected = formatMoneyV2(positiveSummary.remaining, "SEK", "en");
    const hero = getHeroAmount();
    expect(hero.textContent).toBe(expected);
    expect(hero.getAttribute("aria-label")).toBe(expected);
  });

  it("omits the breathing halo entirely", () => {
    renderModal({ reviewState: positiveState, summary: positiveSummary });
    expect(queryHalo()).toBeNull();
  });

  it("renders the mascot without the floating-animation class", () => {
    renderModal({ reviewState: positiveState, summary: positiveSummary });

    const mascot = queryMascot();
    expect(mascot).not.toBeNull();
    expect(mascot!.className).not.toContain("cm-mascot-float");
  });
});

describe("CloseMonthReviewModal — count-up animation", () => {
  it("starts the hero amount at 0 and settles to the target under normal motion", () => {
    // Fake-timer-driven RAF lets us prove the animation actually runs in
    // the non-reduce-motion path rather than relying on real-time delays.
    vi.useFakeTimers();

    renderModal({
      reviewState: positiveState,
      summary: positiveSummary,
    });

    // First render: useCountUp starts at 0; the RAF tick has not fired yet.
    const startingAmount = getHeroAmount();
    const zeroLabel = formatMoneyV2(0, "SEK", "en");
    expect(startingAmount.textContent).toBe(zeroLabel);

    // Advance well past the 1100ms duration so the eased value clamps to
    // the target on the final tick.
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const settledAmount = getHeroAmount();
    const targetLabel = formatMoneyV2(positiveSummary.remaining, "SEK", "en");
    expect(settledAmount.textContent).toBe(targetLabel);
    // aria-label always carries the settled value regardless of timing.
    expect(settledAmount.getAttribute("aria-label")).toBe(targetLabel);
  });
});
