import { act, fireEvent, render, screen, within } from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import ClosedMonthHandoffCard, {
  type ClosedMonthHandoffCardProps,
} from "../ClosedMonthHandoffCard";

// Both the count-up hook and the SoftConfetti atom read `useReducedMotion`
// from framer-motion. Exposing the flag as a let-binding lets us flip per
// test without dancing around vi.doMock.
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

let mockedLocale: "sv" | "en" | "et" = "en";
vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => mockedLocale,
}));

const baseProps: ClosedMonthHandoffCardProps = {
  closedMonthLabel: "April 2026",
  closedMonthOnlyLabel: "April",
  closedYearLabel: "2026",
  nextMonthLabel: "May 2026",
  finalBalance: 0,
  carryOverMode: "none",
  carryOverAmount: 0,
  monthlyIncome: 70020,
  monthlyExpenses: 59535,
  closedMonthsInYear: 4,
  yearMonthList: Array.from(
    { length: 12 },
    (_, idx) => `2026-${String(idx + 1).padStart(2, "0")}`,
  ),
  currency: "SEK",
  onContinue: () => undefined,
  onDismiss: () => undefined,
};

function renderTakeover(overrides: Partial<ClosedMonthHandoffCardProps> = {}) {
  const onContinue = overrides.onContinue ?? vi.fn();
  const onDismiss = overrides.onDismiss ?? vi.fn();
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

beforeEach(() => {
  reducedMotionFlag = false;
  mockedLocale = "en";
});

afterEach(() => {
  vi.useRealTimers();
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";
});

describe("ClosedMonthHandoffCard — portal + lifecycle", () => {
  it("mounts under document.body and tears down cleanly on unmount", () => {
    const { unmount } = renderTakeover();

    const card = screen.getByTestId("closed-month-handoff-card");
    // Bubble up from the card to confirm it lives directly under <body>,
    // not inside the React root tree.
    let host: ParentNode | null = card.parentNode;
    while (host && host !== document.body) {
      host = host.parentNode;
    }
    expect(host).toBe(document.body);

    unmount();
    expect(
      screen.queryByTestId("closed-month-handoff-card"),
    ).not.toBeInTheDocument();
  });

  it("locks body scroll while mounted and restores it on unmount", () => {
    const { unmount } = renderTakeover();
    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});

describe("ClosedMonthHandoffCard — variants", () => {
  it("positiveFull — surplus panel reads 'carried over' and stamp keeps the saved suffix", () => {
    renderTakeover({
      finalBalance: 1240.5,
      carryOverMode: "full",
      carryOverAmount: 1240.5,
    });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card.getAttribute("data-variant")).toBe("positiveFull");

    const surplus = screen.getByTestId("closed-month-handoff-panel-surplus");
    expect(surplus.textContent?.toLowerCase()).toContain("carried over");
    expect(surplus.textContent).toContain("May 2026");

    const stampLabel = screen.getByTestId(
      "closed-month-handoff-stamp-label",
    );
    expect(stampLabel.textContent?.toLowerCase()).toContain("closed");
    expect(stampLabel.textContent?.toLowerCase()).toContain("saved");
  });

  it("positiveKept — surplus panel reads 'kept in {month}' and selects keep tone", () => {
    renderTakeover({
      finalBalance: 950,
      carryOverMode: "none",
      carryOverAmount: 0,
    });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card.getAttribute("data-variant")).toBe("positiveKept");

    const surplus = screen.getByTestId("closed-month-handoff-panel-surplus");
    expect(surplus.textContent?.toLowerCase()).toContain("kept in april");
  });

  it("balanced — surplus panel reads 'no surplus' and the stamp still shows saved", () => {
    renderTakeover({ finalBalance: 0, carryOverMode: "none", carryOverAmount: 0 });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card.getAttribute("data-variant")).toBe("balanced");

    const surplus = screen.getByTestId("closed-month-handoff-panel-surplus");
    expect(surplus.textContent?.toLowerCase()).toContain("no surplus");

    expect(
      screen
        .getByTestId("closed-month-handoff-stamp-label")
        .textContent?.toLowerCase(),
    ).toContain("saved");
  });

  it("deficit — stamp drops the saved suffix, surplus panel reads 'no surplus', no shame language", () => {
    renderTakeover({
      finalBalance: -750,
      carryOverMode: "none",
      carryOverAmount: 0,
    });

    const card = screen.getByTestId("closed-month-handoff-card");
    expect(card.getAttribute("data-variant")).toBe("deficit");

    const stamp = screen.getByTestId("closed-month-handoff-stamp");
    const stampLabel = within(stamp).getByTestId(
      "closed-month-handoff-stamp-label",
    );
    // Deficit stamp: "Closed" only — never "Closed · saved".
    expect(stampLabel.textContent?.toLowerCase()).toContain("closed");
    expect(stampLabel.textContent?.toLowerCase()).not.toContain("saved");
    expect(stamp.getAttribute("data-deficit")).toBe("true");

    const surplus = screen.getByTestId("closed-month-handoff-panel-surplus");
    expect(surplus.textContent?.toLowerCase()).toContain("no surplus");

    const body = screen
      .getByTestId("closed-month-handoff-body")
      .textContent?.toLowerCase() ?? "";
    expect(body).not.toMatch(/shame|blame|fail(ed|ure)?|bad|you went/);
  });

  it("treats a near-zero final balance as balanced (rounding tolerance)", () => {
    renderTakeover({ finalBalance: 0.001, carryOverMode: "none" });
    expect(
      screen.getByTestId("closed-month-handoff-card").getAttribute("data-variant"),
    ).toBe("balanced");
  });
});

describe("ClosedMonthHandoffCard — confetti palette", () => {
  it("uses the brand palette for positive variants and renders 48 pieces", () => {
    renderTakeover({
      finalBalance: 1240.5,
      carryOverMode: "full",
      carryOverAmount: 1240.5,
    });

    const confetti = screen.getByTestId("soft-confetti");
    expect(confetti.getAttribute("data-palette")).toBe("brand");
    expect(confetti.querySelectorAll(".cm-confetti-piece").length).toBe(48);
  });

  it("uses the muted palette for the deficit variant and renders ~12 pieces", () => {
    renderTakeover({
      finalBalance: -750,
      carryOverMode: "none",
      carryOverAmount: 0,
    });

    const confetti = screen.getByTestId("soft-confetti");
    expect(confetti.getAttribute("data-palette")).toBe("muted");
    expect(confetti.querySelectorAll(".cm-confetti-piece").length).toBe(12);
  });
});

describe("ClosedMonthHandoffCard — dismiss paths", () => {
  it("invokes onContinue when the primary CTA is clicked", () => {
    const { onContinue } = renderTakeover();

    fireEvent.click(screen.getByTestId("closed-month-handoff-continue"));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it("invokes onDismiss when the top-right X is clicked", () => {
    const { onDismiss } = renderTakeover();

    fireEvent.click(screen.getByTestId("closed-month-handoff-dismiss"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("invokes onDismiss when the stay link is clicked", () => {
    const { onDismiss } = renderTakeover();

    fireEvent.click(screen.getByTestId("closed-month-handoff-stay"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("invokes onDismiss when ESC is pressed", () => {
    const { onDismiss } = renderTakeover();

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("ClosedMonthHandoffCard — reduced motion", () => {
  beforeEach(() => {
    reducedMotionFlag = true;
  });

  it("flags the dialog with data-reduce-motion", () => {
    renderTakeover();
    expect(
      screen
        .getByTestId("closed-month-handoff-card")
        .getAttribute("data-reduce-motion"),
    ).toBe("true");
  });

  it("skips the SoftConfetti burst entirely", () => {
    renderTakeover();
    expect(screen.queryByTestId("soft-confetti")).not.toBeInTheDocument();
  });

  it("snaps the income panel value to the settled total (no count-up start at 0)", () => {
    renderTakeover({ monthlyIncome: 70020 });

    // formatMoneyV2 doesn't add a trailing currency-with-space the same
    // way Swedish does, but the test is locale-stable as long as the
    // number "70" / "70020" / "70 020" segment is present.
    const income = screen.getByTestId("closed-month-handoff-panel-income");
    expect(income.textContent).toMatch(/70/);
    expect(income.textContent).not.toMatch(/^\s*[^0-9]*0\s*[^0-9]+$/);
  });
});

describe("ClosedMonthHandoffCard — count-up animation", () => {
  it("starts the income panel at 0 and settles to the target under normal motion", () => {
    vi.useFakeTimers();
    renderTakeover({ monthlyIncome: 70020 });

    const income = screen.getByTestId("closed-month-handoff-panel-income");
    // With non-reduced motion, useCountUp boots at 0.
    expect(income.textContent ?? "").toMatch(/\b0\b/);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    const settled = screen.getByTestId("closed-month-handoff-panel-income");
    expect(settled.textContent).toMatch(/70/);
  });
});

describe("ClosedMonthHandoffCard — localization", () => {
  it("renders Swedish stamp + stay copy when locale is sv", () => {
    mockedLocale = "sv";
    renderTakeover({
      finalBalance: 1240.5,
      carryOverMode: "full",
      carryOverAmount: 1240.5,
    });

    expect(
      screen
        .getByTestId("closed-month-handoff-stamp-label")
        .textContent?.toLowerCase(),
    ).toContain("stängd");

    expect(
      screen.getByTestId("closed-month-handoff-stay").textContent?.toLowerCase(),
    ).toMatch(/stanna i april/);
  });
});
