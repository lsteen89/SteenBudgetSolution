import { describe, expect, it } from "vitest";

import { resolvePeriodCloseUiState } from "./resolvePeriodCloseUiState";

describe("resolvePeriodCloseUiState", () => {
  it("keeps open months outside the close window in the normal state", () => {
    const result = resolvePeriodCloseUiState(
      {
        yearMonth: "2026-04",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: "2026-04-30T00:00:00Z",
        closeEligibleAtUtc: "2026-04-30T00:00:00Z",
        isOverdueForClose: false,
      },
      "en",
      new Date("2026-04-20T00:00:00Z"),
    );

    expect(result).toEqual({
      lifecycleState: "normal",
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      noticeText: null,
    });
  });

  it("maps close-window-upcoming months to the upcoming notice state", () => {
    const result = resolvePeriodCloseUiState(
      {
        yearMonth: "2026-04",
        status: "open",
        carryOverMode: "none",
        carryOverAmount: null,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: "2026-04-22T12:00:00Z",
        closeEligibleAtUtc: "2026-04-25T00:00:00Z",
        isOverdueForClose: false,
      },
      "en",
      new Date("2026-04-20T12:00:00Z"),
    );

    expect(result).toEqual({
      lifecycleState: "upcoming",
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      noticeText: "Closing becomes available soon.",
    });
  });

  it("maps close-window-open months to an eligible CTA state", () => {
    const result = resolvePeriodCloseUiState(
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
      canCloseMonth: true,
      closeMonthButtonLabel: "Close Month",
      noticeText: "This month is ready for review and close.",
    });
  });

  it("maps overdue open months to the overdue CTA state", () => {
    const result = resolvePeriodCloseUiState(
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
      canCloseMonth: true,
      closeMonthButtonLabel: "Close Month",
      noticeText: "This month is still open and ready to close.",
    });
  });

  it("does not expose a close CTA for closed months", () => {
    const result = resolvePeriodCloseUiState(
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
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      noticeText: null,
    });
  });

  it("does not expose a close CTA for skipped months", () => {
    const result = resolvePeriodCloseUiState(
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
      canCloseMonth: false,
      closeMonthButtonLabel: null,
      noticeText: null,
    });
  });
});
