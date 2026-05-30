import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BudgetEditorSegmentedBar, {
  type BudgetEditorSegmentedBarSegment,
} from "./BudgetEditorSegmentedBar";

const segment = (
  key: string,
  amount: number,
): BudgetEditorSegmentedBarSegment => ({
  key,
  label: key,
  amount,
  barClassName: `bg-${key}`,
});

function widthPercent(el: HTMLElement): number {
  // The component sets `width: NN.NN%` via inline style. Parse it back so the
  // test asserts intent, not formatting quirks.
  const raw = el.style.width;
  expect(raw).toMatch(/%$/);
  return Number(raw.slice(0, -1));
}

describe("BudgetEditorSegmentedBar", () => {
  it("uses the caller's denominator when it covers the visible total", () => {
    render(
      <BudgetEditorSegmentedBar
        segments={[segment("a", 25), segment("b", 25)]}
        denominator={100}
        ariaLabel="bar"
        testId="bar"
      />,
    );

    expect(widthPercent(screen.getByTestId("bar-a"))).toBeCloseTo(25, 3);
    expect(widthPercent(screen.getByTestId("bar-b"))).toBeCloseTo(25, 3);
  });

  it("fits the bar when visible segments exceed the denominator", () => {
    // Income case: committed outflows exceed available money. The caller
    // passes the headline ("money available"); the bar must still fit and
    // segments must keep their relative proportions.
    render(
      <BudgetEditorSegmentedBar
        segments={[segment("expenses", 60), segment("savings", 40)]}
        denominator={50}
        ariaLabel="bar"
        testId="bar"
      />,
    );

    // visibleTotal = 100, so each segment uses 100 as the denominator.
    expect(widthPercent(screen.getByTestId("bar-expenses"))).toBeCloseTo(60, 3);
    expect(widthPercent(screen.getByTestId("bar-savings"))).toBeCloseTo(40, 3);
  });

  it("hides zero-amount segments and pills only the visible ends", () => {
    render(
      <BudgetEditorSegmentedBar
        segments={[
          segment("a", 10),
          segment("hidden", 0),
          segment("b", 30),
        ]}
        denominator={40}
        ariaLabel="bar"
        testId="bar"
      />,
    );

    expect(screen.queryByTestId("bar-hidden")).toBeNull();

    const a = screen.getByTestId("bar-a");
    const b = screen.getByTestId("bar-b");
    expect(a.className).toContain("rounded-l-full");
    expect(a.className).not.toContain("rounded-r-full");
    expect(b.className).toContain("rounded-r-full");
    expect(b.className).not.toContain("rounded-l-full");
  });

  it("never collapses when denominator and segments are all zero", () => {
    render(
      <BudgetEditorSegmentedBar
        segments={[segment("a", 0)]}
        denominator={0}
        ariaLabel="bar"
        testId="bar"
      />,
    );

    // No visible segments — the bar container still renders without crashing
    // and stays empty so the strip can decide whether to hide it.
    expect(screen.getByTestId("bar")).toBeEmptyDOMElement();
  });
});
