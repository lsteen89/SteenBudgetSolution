import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MonthRail, { type MonthRailViewModel } from "./MonthRail";

function makeVm(overrides: Partial<MonthRailViewModel> = {}): MonthRailViewModel {
  return {
    ariaLabel: "Month rail",
    loadingLabel: "Loading period",
    current: {
      yearMonth: "2026-06",
      label: "June 2026",
      status: "open",
      statusLabel: "Open",
      tone: "success",
    },
    previous: {
      label: "May 2026",
      disabled: false,
      ariaLabel: "Go to previous month: May 2026",
    },
    next: {
      label: "July 2026",
      disabled: false,
      ariaLabel: "Go to next month: July 2026",
    },
    ribbonItems: [
      { label: "Active planning", tone: "neutral", icon: "status" },
      { label: "Continue with July 2026.", tone: "neutral", icon: "next" },
    ],
    action: { type: "none" },
    ...overrides,
  };
}

describe("MonthRail — open month, normal", () => {
  it("renders the period label, status pill, and ribbon items", () => {
    render(<MonthRail vm={makeVm()} />);

    expect(screen.getByTestId("active-month-label")).toHaveTextContent(
      "June 2026",
    );
    expect(screen.getByTestId("month-status-badge")).toHaveTextContent("Open");
    expect(screen.getByTestId("period-status-ribbon")).toBeInTheDocument();
    expect(screen.queryByTestId("close-month-cta")).toBeNull();
  });

  it("invokes nav callbacks when prev/next are clicked", () => {
    const onGoPrevious = vi.fn();
    const onGoNext = vi.fn();
    render(
      <MonthRail
        vm={makeVm()}
        onGoPrevious={onGoPrevious}
        onGoNext={onGoNext}
      />,
    );

    fireEvent.click(screen.getByTestId("month-nav-previous"));
    fireEvent.click(screen.getByTestId("month-nav-next"));

    expect(onGoPrevious).toHaveBeenCalledTimes(1);
    expect(onGoNext).toHaveBeenCalledTimes(1);
  });
});

describe("MonthRail — close readiness", () => {
  it("renders the close CTA when the open month is eligible", () => {
    const onCloseMonth = vi.fn();
    render(
      <MonthRail
        vm={makeVm({
          action: {
            type: "close",
            label: "Close Month",
            helperText: "Ready to finalize",
            attention: false,
          },
        })}
        onCloseMonth={onCloseMonth}
      />,
    );

    const cta = screen.getByTestId("close-month-cta");
    expect(cta).toHaveTextContent("Close Month");
    fireEvent.click(cta);
    expect(onCloseMonth).toHaveBeenCalledTimes(1);
  });

  it("uses the attention treatment when the month is overdue for close", () => {
    render(
      <MonthRail
        vm={makeVm({
          action: {
            type: "close",
            label: "Close Month",
            helperText: "Action required",
            attention: true,
          },
        })}
        onCloseMonth={() => undefined}
      />,
    );

    expect(screen.getByTestId("close-month-cta")).toBeInTheDocument();
    expect(screen.getByText("Action required")).toBeInTheDocument();
  });
});

describe("MonthRail — closed month, read-only", () => {
  it("never renders a close CTA for a closed month", () => {
    render(
      <MonthRail
        vm={makeVm({
          current: {
            yearMonth: "2026-05",
            label: "May 2026",
            status: "closed",
            statusLabel: "Closed",
            tone: "success",
          },
          ribbonItems: [
            { label: "Locked snapshot", tone: "success", icon: "lock" },
          ],
          action: { type: "none" },
        })}
        onCloseMonth={vi.fn()}
      />,
    );

    expect(screen.getByTestId("month-status-badge")).toHaveTextContent(
      "Closed",
    );
    expect(screen.queryByTestId("close-month-cta")).toBeNull();
    expect(screen.queryByTestId("period-action-passive")).toBeNull();
  });

  it("renders a passive continue action when one is supplied", () => {
    const onContinue = vi.fn();
    render(
      <MonthRail
        vm={makeVm({
          current: {
            yearMonth: "2026-05",
            label: "May 2026",
            status: "closed",
            statusLabel: "Closed",
            tone: "success",
          },
          action: {
            type: "continue",
            label: "Continue with June 2026",
            targetYearMonth: "2026-06",
            ariaLabel: "Continue with June 2026",
          },
        })}
        onContinueAction={onContinue}
      />,
    );

    const continueBtn = screen.getByTestId("period-action-continue");
    expect(continueBtn).toHaveTextContent("Continue with June 2026");
    fireEvent.click(continueBtn);
    expect(onContinue).toHaveBeenCalledWith("2026-06");
    expect(screen.queryByTestId("close-month-cta")).toBeNull();
  });
});

describe("MonthRail — skipped month, read-only", () => {
  it("renders the skip status and no close CTA", () => {
    render(
      <MonthRail
        vm={makeVm({
          current: {
            yearMonth: "2026-03",
            label: "March 2026",
            status: "skipped",
            statusLabel: "Skipped",
            tone: "muted",
          },
          ribbonItems: [
            { label: "Locked history", tone: "muted", icon: "skip" },
          ],
          action: { type: "passive", label: "No snapshot", tone: "muted" },
        })}
        onCloseMonth={vi.fn()}
      />,
    );

    expect(screen.getByTestId("month-status-badge")).toHaveTextContent(
      "Skipped",
    );
    expect(screen.queryByTestId("close-month-cta")).toBeNull();
    expect(screen.getByTestId("period-action-passive")).toHaveTextContent(
      "No snapshot",
    );
  });
});

describe("MonthRail — switching month", () => {
  it("disables nav buttons and hides the status badge while switching", () => {
    render(<MonthRail vm={makeVm()} isSwitchingMonth />);

    expect(screen.getByTestId("month-nav-previous")).toBeDisabled();
    expect(screen.getByTestId("month-nav-next")).toBeDisabled();
    expect(screen.queryByTestId("month-status-badge")).toBeNull();
    expect(screen.getByText("Loading period")).toBeInTheDocument();
  });
});

describe("MonthRail — nav availability", () => {
  it("reflects view-model disabled flags on prev/next buttons", () => {
    render(
      <MonthRail
        vm={makeVm({
          previous: {
            label: "Previous",
            disabled: true,
            ariaLabel: "Previous month is not available",
          },
          next: {
            label: "Next",
            disabled: true,
            ariaLabel: "Next month is not available",
          },
        })}
      />,
    );

    expect(screen.getByTestId("month-nav-previous")).toBeDisabled();
    expect(screen.getByTestId("month-nav-next")).toBeDisabled();
  });
});
