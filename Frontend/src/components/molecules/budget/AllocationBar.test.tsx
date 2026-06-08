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
  unfunded: "Unfunded",
  runsOutMarker: "Runs out",
};

function widthPercent(el: HTMLElement): number {
  const raw = el.style.width;
  expect(raw).toMatch(/%$/);
  return Number(raw.slice(0, -1));
}

function leftPercent(el: HTMLElement): number {
  const raw = el.style.left;
  expect(raw).toMatch(/%$/);
  return Number(raw.slice(0, -1));
}

function renderBar(terms: AllocationBarTerms) {
  return render(<AllocationBar terms={terms} labels={labels} testId="bar" />);
}

function visibleSegmentTotal(): number {
  return ["bar-expenses", "bar-savings", "bar-debts", "bar-free"]
    .map((id) => screen.queryByTestId(id))
    .filter((el): el is HTMLElement => el != null)
    .reduce((sum, el) => sum + widthPercent(el), 0);
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

describe("AllocationBar — surplus", () => {
  it("renders expenses, savings, debts and a free segment proportional to backend remaining", () => {
    // committed = 70, backend remaining = 30 → implicit inflow 100.
    renderBar({ expenses: 40, savings: 20, debts: 10, remaining: 30 });

    expect(widthPercent(screen.getByTestId("bar-expenses"))).toBeCloseTo(40, 3);
    expect(widthPercent(screen.getByTestId("bar-savings"))).toBeCloseTo(20, 3);
    expect(widthPercent(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(widthPercent(screen.getByTestId("bar-free"))).toBeCloseTo(30, 3);
    expect(visibleSegmentTotal()).toBeCloseTo(100, 3);
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();
    expect(screen.queryByTestId("bar-unfunded")).toBeNull();
  });

  it("hides zero-amount segments and pills the visible outer ends", () => {
    renderBar({ expenses: 60, savings: 0, debts: 0, remaining: 40 });

    expect(screen.queryByTestId("bar-savings")).toBeNull();
    expect(screen.queryByTestId("bar-debts")).toBeNull();
    const expenses = screen.getByTestId("bar-expenses");
    const free = screen.getByTestId("bar-free");
    expect(expenses.className).toContain("rounded-l-full");
    expect(free.className).toContain("rounded-r-full");
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
    expect(within(bar).queryByTestId("bar-unfunded")).toBeNull();
    expect(within(bar).queryByTestId("bar-runs-out")).toBeNull();
  });

  it("renders a zero-remaining month as a fully committed bar with no free tail", () => {
    renderBar({ expenses: 70, savings: 20, debts: 10, remaining: 0 });

    expect(widthPercent(screen.getByTestId("bar-expenses"))).toBeCloseTo(70, 3);
    expect(widthPercent(screen.getByTestId("bar-savings"))).toBeCloseTo(20, 3);
    expect(widthPercent(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(screen.queryByTestId("bar-free")).toBeNull();
    expect(screen.queryByTestId("bar-unfunded")).toBeNull();
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();
    expect(visibleSegmentTotal()).toBeCloseTo(100, 3);
  });
});

describe("AllocationBar — deficit", () => {
  it("never overflows: committed segments still sum to <= 100% in deficit", () => {
    // committed = 100, backend remaining = -20 → inflow 80.
    renderBar({ expenses: 60, savings: 30, debts: 10, remaining: -20 });

    expect(widthPercent(screen.getByTestId("bar-expenses"))).toBeCloseTo(60, 3);
    expect(widthPercent(screen.getByTestId("bar-savings"))).toBeCloseTo(30, 3);
    expect(widthPercent(screen.getByTestId("bar-debts"))).toBeCloseTo(10, 3);
    expect(visibleSegmentTotal()).toBeLessThanOrEqual(100 + 1e-3);
    expect(screen.queryByTestId("bar-free")).toBeNull();
  });

  it("renders the unfunded tail as an overlay anchored at the runs-out point", () => {
    renderBar({ expenses: 60, savings: 30, debts: 10, remaining: -20 });

    const unfunded = screen.getByTestId("bar-unfunded");
    const runsOut = screen.getByTestId("bar-runs-out");

    // inflow / committed = 80 / 100 → marker and overlay anchor at 80%.
    expect(leftPercent(unfunded)).toBeCloseTo(80, 3);
    expect(unfunded.style.right).toBe("0px");
    expect(leftPercent(runsOut)).toBeCloseTo(80, 3);
  });

  it("anchors the runs-out marker at 0% when implicit inflow is non-positive", () => {
    // Catastrophic: backend reports remaining well below -committed.
    renderBar({ expenses: 80, savings: 0, debts: 0, remaining: -150 });

    expect(leftPercent(screen.getByTestId("bar-runs-out"))).toBeCloseTo(0, 3);
    expect(leftPercent(screen.getByTestId("bar-unfunded"))).toBeCloseTo(0, 3);
    expect(widthPercent(screen.getByTestId("bar-expenses"))).toBeCloseTo(100, 3);
    expect(visibleSegmentTotal()).toBeLessThanOrEqual(100 + 1e-3);
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

    // Surplus mode: free segment present, no overlay, no marker.
    expect(screen.getByTestId("bar-free")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-unfunded")).toBeNull();
    expect(screen.queryByTestId("bar-runs-out")).toBeNull();

    // Implicit inflow = committed + remaining = 31000.
    expect(widthPercent(screen.getByTestId("bar-free"))).toBeCloseTo(
      (7000 / 31000) * 100,
      3,
    );
    expect(visibleSegmentTotal()).toBeCloseTo(100, 3);
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

    expect(screen.getByTestId("bar-unfunded")).toBeInTheDocument();
    expect(screen.queryByTestId("bar-free")).toBeNull();
    const expectedPct = (50 / 100) * 100;
    expect(leftPercent(screen.getByTestId("bar-runs-out"))).toBeCloseTo(
      expectedPct,
      3,
    );
  });
});
