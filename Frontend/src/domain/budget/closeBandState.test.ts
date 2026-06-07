import { describe, expect, it } from "vitest";

import type {
  DashboardPeriodHeaderSummary,
  HeaderLifecycleState,
} from "@/hooks/dashboard/dashboardSummary.types";
import type { CloseAvailability } from "@/hooks/dashboard/getCloseAvailabilityLabel";

import { resolveCloseBandState } from "./closeBandState";

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

describe("resolveCloseBandState — periodStatus gating", () => {
  it("returns absent for closed months even if lifecycle says eligible", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        periodStatus: "closed",
        lifecycleState: "eligible",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: 1234,
    });
    expect(state).toEqual({ kind: "absent" });
  });

  it("returns absent for skipped months even if backend allows close", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        periodStatus: "skipped",
        canCloseMonth: true,
      }),
      closeAvailability: countdownAvailability,
      remaining: 0,
    });
    expect(state).toEqual({ kind: "absent" });
  });
});

describe("resolveCloseBandState — overdue", () => {
  it("returns overdue with CTA enabled when backend allows close", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "overdue",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: 500,
    });
    expect(state).toMatchObject({
      kind: "overdue",
      canCloseMonth: true,
      carryForwardPreview: 500,
      carryForwardTone: "positive",
    });
  });

  it("returns overdue without CTA when backend refuses close (inconsistent backend state)", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "overdue",
        canCloseMonth: false,
      }),
      closeAvailability: noneAvailability,
      remaining: 200,
    });
    expect(state).toMatchObject({
      kind: "overdue",
      canCloseMonth: false,
    });
  });

  it("treats deficit overdue as zero carry-forward with deficit tone", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "overdue",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: -750.42,
    });
    expect(state).toMatchObject({
      kind: "overdue",
      carryForwardPreview: 0,
      carryForwardTone: "deficit",
    });
  });
});

describe("resolveCloseBandState — eligible", () => {
  it("returns eligible when lifecycle is eligible and backend allows close", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "eligible",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: 1200.5,
    });
    expect(state).toMatchObject({
      kind: "eligible",
      canCloseMonth: true,
      carryForwardPreview: 1200.5,
      carryForwardTone: "positive",
    });
  });

  it("falls back to eligible when only closeAvailability is ready", () => {
    // Models a backend where lifecycleState lags behind closeAvailability —
    // we prefer the affirmative signal so the user is never stuck in a quiet
    // upcoming/absent state when closing is actually open.
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "normal" as HeaderLifecycleState,
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: 0,
    });
    expect(state).toMatchObject({
      kind: "eligible",
      canCloseMonth: true,
      carryForwardPreview: 0,
      carryForwardTone: "zero",
    });
  });

  it("returns eligible without CTA when backend refuses close", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "eligible",
        canCloseMonth: false,
      }),
      closeAvailability: readyAvailability,
      remaining: 100,
    });
    expect(state).toMatchObject({
      kind: "eligible",
      canCloseMonth: false,
    });
  });
});

describe("resolveCloseBandState — upcoming", () => {
  it("returns upcoming with countdown label when not yet eligible", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "upcoming",
        canCloseMonth: false,
      }),
      closeAvailability: countdownAvailability,
      remaining: 800,
    });
    expect(state).toMatchObject({
      kind: "upcoming",
      countdownLabel: "Closes in 3 days",
      carryForwardPreview: 800,
      carryForwardTone: "positive",
    });
  });

  it("does not promote countdown to eligible just because lifecycle is normal", () => {
    // A countdown without the narrow "upcoming" lifecycle state must NOT
    // render the band — getCloseAvailabilityLabel returns countdowns weeks
    // out, while the band's "upcoming" treatment is the last-stretch-before-
    // close state owned by the backend's lifecycleState. Anything else
    // belongs in `absent` so calm mid-month dashboards stay calm.
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "normal",
        canCloseMonth: false,
      }),
      closeAvailability: countdownAvailability,
      remaining: 0,
    });
    expect(state).toEqual({ kind: "absent" });
  });

  it("returns absent when lifecycle is upcoming but no countdown is available", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "upcoming",
        canCloseMonth: false,
      }),
      closeAvailability: noneAvailability,
      remaining: 500,
    });
    expect(state).toEqual({ kind: "absent" });
  });
});

describe("resolveCloseBandState — absent", () => {
  it("returns absent for a calm/normal lifecycle with no countdown", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "normal",
        canCloseMonth: false,
      }),
      closeAvailability: noneAvailability,
      remaining: 2500,
    });
    expect(state).toEqual({ kind: "absent" });
  });
});

describe("resolveCloseBandState — carry-forward edge cases", () => {
  it("clamps sub-epsilon positive remaining to zero tone", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "eligible",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: 0.004, // below REMAINING_EPSILON
    });
    expect(state).toMatchObject({
      kind: "eligible",
      carryForwardPreview: 0,
      carryForwardTone: "zero",
    });
  });

  it("clamps sub-epsilon negative remaining to zero tone (not deficit)", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "eligible",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: -0.004,
    });
    expect(state).toMatchObject({
      carryForwardPreview: 0,
      carryForwardTone: "zero",
    });
  });

  it("never reports a negative carry-forward preview for a real deficit", () => {
    const state = resolveCloseBandState({
      header: buildHeader({
        lifecycleState: "eligible",
        canCloseMonth: true,
      }),
      closeAvailability: readyAvailability,
      remaining: -1500,
    });
    if (state.kind === "absent" || state.kind === "upcoming") {
      throw new Error(`Unexpected state kind: ${state.kind}`);
    }
    expect(state.carryForwardPreview).toBe(0);
    expect(state.carryForwardTone).toBe("deficit");
  });
});
