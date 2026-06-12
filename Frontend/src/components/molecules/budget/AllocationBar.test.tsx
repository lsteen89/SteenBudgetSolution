import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import AllocationBar, {
  ALLOCATION_SEGMENT_BAR_CLASS,
  getVisibleAllocationSegments,
  type AllocationBarLabels,
  type AllocationBarTerms,
} from "./AllocationBar";

const labels: AllocationBarLabels = {
  ariaLabel: "Allocation",
  expenses: "Expenses",
  savings: "Savings",
  debts: "Debts",
  free: "Free",
  runsOutMarker: "Runs out",
};

/**
 * Segments size proportionally via `flex-grow` (the grow factor IS the
 * amount), so proportion assertions read the grow value rather than a width
 * percentage.
 */
function flexGrowOf(el: HTMLElement): number {
  const raw = el.style.flexGrow;
  expect(raw).not.toBe("");
  return Number(raw);
}

function leftPercent(el: HTMLElement): number {
  const raw = el.style.left;
  expect(raw).toMatch(/%$/);
  return Number(raw.slice(0, -1));
}

function renderBar(terms: AllocationBarTerms) {
  return render(<AllocationBar terms={terms} labels={labels} testId="bar" />);
}

describe("AllocationBar — calm palette + segment helper", () => {
  it("colours planned outflows with the calm palette, never danger red", () => {
    renderBar({ expenses: 40, savings: 20, debts: 10, remaining: 30 });

    expect(screen.getByTestId("bar-expenses").className).toContain(
      ALLOCATION_SEGMENT_BAR_CLASS.expenses,
    );
    expect(screen.getByTestId("bar-expenses").className).not.toContain(
      "bg-eb-danger",
    );
    expect(screen.getByTestId("bar-savings").className).toContain(
      ALLOCATION_SEGMENT_BAR_CLASS.savings,
    );
    expect(screen.getByTestId("bar-debts").className).toContain(
      ALLOCATION_SEGMENT_BAR_CLASS.debts,
    );
    expect(screen.getByTestId("bar-free").className).toContain(
      ALLOCATION_SEGMENT_BAR_CLASS.free,
    );
  });

  it("getVisibleAllocationSegments mirrors the rendered segments", () => {
    // Surplus: all four visible.
    expect(
      getVisibleAllocationSegments({
        expenses: 40,
        savings: 20,
        debts: 10,
        remaining: 30,
      }).map((s) => s.key),
    ).toEqual(["expenses", "savings", "debts", "free"]);

    // Deficit drops free; zero-width segments drop out.
    expect(
      getVisibleAllocationSegments({
        expenses: 60,
        savings: 30,
        debts: 0,
        remaining: -20,
      }).map((s) => s.key),
    ).toEqual(["expenses", "savings"]);
  });
});

describe("AllocationBar — segmented blueprint grammar (V2 PR2)", () => {
  it("renders discrete rectangular segments, not one rounded pill track", () => {
    renderBar({ expenses: 40, savings: 20, debts: 10, remaining: 30 });

    // No pill-style single track: neither the container nor the segments use
    // full rounding, and there is no full-track background to overflow-clip.
    const bar = screen.getByTestId("bar");
    expect(bar.className).not.toContain("rounded-full");
    expect(bar.className).not.toContain("overflow-hidden");

    for (const id of ["bar-expenses", "bar-savings", "bar-debts", "bar-free"]) {
      const segment = screen.getByTestId(id);
      expect(segment.className).toContain("rounded-[4px]");
      expect(segment.className).not.toContain("rounded-l-full");
      expect(segment.className).not.toContain("rounded-r-full");
    }
  });
});

describe("AllocationBar — surplus", () => {
  it("renders expenses, savings, debts and a free segment proportional to backend remaining", () => {
    // committed = 70, backend remaining = 30 → grow factors are the amounts.
    renderBar({ expenses: 40, savings: 20, debts: 10, remaining: 30 });

    expect(flexGrowOf(screen.getByTestId("bar-expenses"))).toBeCloseTo(40, 3);
    expect(flexGrowOf(screen.getByTestId("bar-savings"))).toBeCloseTo(20, 3);
    expect(flexGrowOf(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(flexGrowOf(screen.getByTestId("bar-free"))).toBeCloseTo(30, 3);
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();
  });

  it("hides zero-amount segments", () => {
    renderBar({ expenses: 60, savings: 0, debts: 0, remaining: 40 });

    expect(screen.queryByTestId("bar-savings")).toBeNull();
    expect(screen.queryByTestId("bar-debts")).toBeNull();
    expect(screen.getByTestId("bar-expenses")).toBeInTheDocument();
    expect(screen.getByTestId("bar-free")).toBeInTheDocument();
  });
});

describe("AllocationBar — zero", () => {
  it("renders an empty bar when there is no money and no commitments", () => {
    renderBar({ expenses: 0, savings: 0, debts: 0, remaining: 0 });

    const bar = screen.getByTestId("bar");
    expect(within(bar).queryByTestId("bar-expenses")).toBeNull();
    expect(within(bar).queryByTestId("bar-savings")).toBeNull();
    expect(within(bar).queryByTestId("bar-debts")).toBeNull();
    expect(within(bar).queryByTestId("bar-free")).toBeNull();
    expect(within(bar).queryByTestId("bar-runs-out")).toBeNull();
  });

  it("renders a zero-remaining month as a fully committed bar with no free tail", () => {
    renderBar({ expenses: 70, savings: 20, debts: 10, remaining: 0 });

    expect(flexGrowOf(screen.getByTestId("bar-expenses"))).toBeCloseTo(70, 3);
    expect(flexGrowOf(screen.getByTestId("bar-savings"))).toBeCloseTo(20, 3);
    expect(flexGrowOf(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(screen.queryByTestId("bar-free")).toBeNull();
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();
  });
});

describe("AllocationBar — deficit", () => {
  it("shows committed segments only, with no free segment", () => {
    // committed = 100, backend remaining = -20 → inflow 80.
    renderBar({ expenses: 60, savings: 30, debts: 10, remaining: -20 });

    expect(flexGrowOf(screen.getByTestId("bar-expenses"))).toBeCloseTo(60, 3);
    expect(flexGrowOf(screen.getByTestId("bar-savings"))).toBeCloseTo(30, 3);
    expect(flexGrowOf(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(screen.queryByTestId("bar-free")).toBeNull();
  });

  it("anchors the runs-out marker where the month's money ends, with no striped overlay", () => {
    renderBar({ expenses: 60, savings: 30, debts: 10, remaining: -20 });

    // inflow / committed = 80 / 100 → marker anchors at 80%.
    expect(leftPercent(screen.getByTestId("bar-runs-out"))).toBeCloseTo(80, 3);
    expect(screen.queryByTestId("bar-unfunded")).toBeNull();
  });

  it("draws the runs-out marker as a thin danger line", () => {
    renderBar({ expenses: 60, savings: 30, debts: 10, remaining: -20 });

    const runsOut = screen.getByTestId("bar-runs-out");
    expect(runsOut.className).toContain("bg-eb-danger");
  });

  it("anchors the runs-out marker at 0% when implicit inflow is non-positive", () => {
    // Catastrophic: backend reports remaining well below -committed.
    renderBar({ expenses: 80, savings: 0, debts: 0, remaining: -150 });

    expect(leftPercent(screen.getByTestId("bar-runs-out"))).toBeCloseTo(0, 3);
    expect(flexGrowOf(screen.getByTestId("bar-expenses"))).toBeCloseTo(80, 3);
  });
});

describe("AllocationBar — backend authority", () => {
  it("uses terms.remaining as the source of surplus/deficit regardless of client equation", () => {
    // Scenario MoneyState + bar both consume terms from the same
    // DashboardTermsResult where the backend says remaining=7000 even though
    // a hypothetical client equation would compute 6000. The bar must show
    // backend's surplus picture; it must not flip to deficit or change the
    // free segment based on a re-derivation.
    renderBar({
      expenses: 18000,
      savings: 4000,
      debts: 2000,
      remaining: 7000,
    });

    // Surplus mode: free segment present, no marker.
    expect(screen.getByTestId("bar-free")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();

    // The free grow factor is backend remaining itself.
    expect(flexGrowOf(screen.getByTestId("bar-free"))).toBeCloseTo(7000, 3);
  });

  it("shows a deficit when backend remaining is negative even if commitments look small", () => {
    // Inverse: backend reports a deficit driven by a negative carry-over
    // that swamps reported income/commitments. The bar must follow.
    renderBar({
      expenses: 100,
      savings: 0,
      debts: 0,
      remaining: -50,
    });

    expect(screen.getByTestId("bar-runs-out")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-free")).toBeNull();
    const expectedPct = (50 / 100) * 100;
    expect(leftPercent(screen.getByTestId("bar-runs-out"))).toBeCloseTo(
      expectedPct,
      3,
    );
  });
});
