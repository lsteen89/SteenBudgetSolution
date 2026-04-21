import { describe, expect, it } from "vitest";

import { resolvePeriodAdvanceUiState } from "./resolvePeriodAdvanceUiState";

describe("resolvePeriodAdvanceUiState", () => {
  it("maps close-window-open months to an eligible CTA state", () => {
    const result = resolvePeriodAdvanceUiState(
      {
        yearMonth: "2026-04",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: true,
        closeWindowOpensAtUtc: "2026-04-25T00:00:00Z",
        closeEligibleAtUtc: "2026-04-25T00:00:00Z",
        isOverdueForClose: false,
      },
      "en",
    );

    expect(result).toEqual({
      lifecycleState: "eligible",
      canAdvancePeriod: true,
      advanceButtonLabel: "Close Month",
      noticeText: "This month is ready to close.",
    });
  });

  it("maps overdue open months to the overdue CTA state", () => {
    const result = resolvePeriodAdvanceUiState(
      {
        yearMonth: "2026-04",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: true,
        closeWindowOpensAtUtc: "2026-04-25T00:00:00Z",
        closeEligibleAtUtc: "2026-04-25T00:00:00Z",
        isOverdueForClose: true,
      },
      "en",
    );

    expect(result).toEqual({
      lifecycleState: "overdue",
      canAdvancePeriod: true,
      advanceButtonLabel: "Close Month",
      noticeText: "Your next budget month is ready to start.",
    });
  });

  it("keeps open months outside the close window in the normal state", () => {
    const result = resolvePeriodAdvanceUiState(
      {
        yearMonth: "2026-04",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: "2026-04-25T00:00:00Z",
        closeEligibleAtUtc: "2026-04-25T00:00:00Z",
        isOverdueForClose: false,
      },
      "en",
    );

    expect(result).toEqual({
      lifecycleState: "normal",
      canAdvancePeriod: false,
      advanceButtonLabel: null,
      noticeText: null,
    });
  });

  it("does not expose a close CTA for closed months", () => {
    const result = resolvePeriodAdvanceUiState(
      {
        yearMonth: "2026-04",
        status: "closed",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      "en",
    );

    expect(result).toEqual({
      lifecycleState: "normal",
      canAdvancePeriod: false,
      advanceButtonLabel: null,
      noticeText: null,
    });
  });

  it("does not expose a close CTA for skipped months", () => {
    const result = resolvePeriodAdvanceUiState(
      {
        yearMonth: "2026-04",
        status: "skipped",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      "en",
    );

    expect(result).toEqual({
      lifecycleState: "normal",
      canAdvancePeriod: false,
      advanceButtonLabel: null,
      noticeText: null,
    });
  });
});
