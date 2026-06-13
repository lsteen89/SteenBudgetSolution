import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import NextMonthPreviewPage from "./NextMonthPreviewPage";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";

// ---- Hook / store mocks --------------------------------------------------

const mockUseBudgetMonthsStatusQuery = vi.fn();
const mockUseNextMonthPreviewQuery = vi.fn();
const mockUseBudgetDashboardMonthQuery = vi.fn();
const mockUsePlanNextMonthMutation = vi.fn();

vi.mock("@/hooks/i18n/useAppLocale", () => ({
  useAppLocale: () => "en",
}));

vi.mock("@/stores/Auth/authStore", () => ({
  useAuthStore: (selector: (s: unknown) => unknown) =>
    selector({ user: { firstLogin: false } }),
}));

vi.mock("@/hooks/budget/useBudgetMonthsStatusQuery", () => ({
  useBudgetMonthsStatusQuery: () => mockUseBudgetMonthsStatusQuery(),
}));

vi.mock("@/hooks/budget/useNextMonthPreviewQuery", () => ({
  useNextMonthPreviewQuery: (...args: unknown[]) =>
    mockUseNextMonthPreviewQuery(...args),
}));

vi.mock("@/hooks/budget/useBudgetDashboardMonthQuery", () => ({
  useBudgetDashboardMonthQuery: (...args: unknown[]) =>
    mockUseBudgetDashboardMonthQuery(...args),
  budgetDashboardMonthQueryKey: (ym?: string | null) => [
    "budgetDashboardMonth",
    ym ?? null,
  ],
}));

vi.mock("@/hooks/budget/usePlanNextMonthMutation", () => ({
  usePlanNextMonthMutation: () => mockUsePlanNextMonthMutation(),
}));

function statusWithOpenMonth(openMonth: string | null = "2026-05") {
  return {
    data: {
      openMonthYearMonth: openMonth,
      currentYearMonth: "2026-05",
      gapMonthsCount: 0,
      months: [],
      suggestedAction: "none" as const,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

type MonthStatusLiteral = "open" | "planned" | "closed" | "skipped";

function statusWithNextMonth(nextStatus: MonthStatusLiteral) {
  return {
    data: {
      openMonthYearMonth: "2026-05",
      currentYearMonth: "2026-05",
      gapMonthsCount: 0,
      months: [
        { yearMonth: "2026-05", status: "open", openedAt: "", closedAt: null },
        {
          yearMonth: "2026-06",
          status: nextStatus,
          openedAt: "",
          closedAt: null,
        },
      ],
      suggestedAction: "none" as const,
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function dashboardMonthState(
  dashboard: NextMonthPreviewDto["dashboard"],
  extra: Partial<{ isPending: boolean; isError: boolean; error: unknown }> = {},
) {
  return {
    data: {
      currencyCode: "SEK",
      month: {
        yearMonth: "2026-06",
        status: "planned",
        carryOverMode: "full",
        carryOverAmount: 18623,
        isCloseWindowOpen: false,
        closeWindowOpensAtUtc: null,
        closeEligibleAtUtc: null,
        isOverdueForClose: false,
      },
      liveDashboard: dashboard,
      snapshotTotals: null,
    },
    isPending: extra.isPending ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
    refetch: vi.fn(),
  };
}

function previewSuccess(
  overrides: Partial<NextMonthPreviewDto> = {},
): NextMonthPreviewDto {
  const dashboard = {
    budgetId: "b1",
    income: {
      netSalaryMonthly: 38500,
      incomePaymentDayType: null,
      incomePaymentDay: null,
      sideHustleMonthly: 0,
      householdMembersMonthly: 13200,
      totalIncomeMonthly: 51700,
      sideHustles: [],
      householdMembers: [],
    },
    expenditure: { totalExpensesMonthly: 23200, byCategory: [] },
    savings: {
      monthlySavings: 3000,
      totalGoalSavingsMonthly: 5000,
      totalSavingsMonthly: 8000,
      isMonthOnly: false,
      goals: [],
    },
    debt: {
      totalDebtBalance: 114600,
      totalMonthlyPayments: 4500,
      debts: [],
      repaymentStrategy: "avalanche",
    },
    carryOverAmountMonthly: 18623,
    disposableAfterExpensesWithCarryMonthly: 47123,
    disposableAfterExpensesAndSavingsWithCarryMonthly: 39123,
    // 51700 + 18623 − 23200 − 8000 − 4500 = 34623
    finalBalanceWithCarryMonthly: 34623,
    recurringExpenses: [],
    subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
  };

  return {
    fromYearMonth: "2026-05",
    previewYearMonth: "2026-06",
    state: "preview",
    basis: "budgetPlan",
    currencyCode: "SEK",
    carryOver: {
      mode: "estimatedFull",
      amount: 18623,
      source: "currentMonthLiveFinalBalance",
      isFinal: false,
    },
    dashboard: dashboard as unknown as NextMonthPreviewDto["dashboard"],
    limitations: ["Projected from your budget plan with nothing changed."],
    ...overrides,
  };
}

function previewQueryState(
  data: NextMonthPreviewDto | undefined,
  extra: Partial<{ isPending: boolean; isError: boolean; error: unknown }> = {},
) {
  return {
    data,
    isPending: extra.isPending ?? false,
    isError: extra.isError ?? false,
    error: extra.error ?? null,
    refetch: vi.fn(),
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location-probe">{location.pathname}</span>;
}

function renderPage(initialPath = "/dashboard/next-month") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <NextMonthPreviewPage />
      <LocationProbe />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUseBudgetMonthsStatusQuery.mockReset();
  mockUseNextMonthPreviewQuery.mockReset();
  mockUseBudgetDashboardMonthQuery.mockReset();
  mockUsePlanNextMonthMutation.mockReset();

  // Defaults: the planned dashboard read is idle (preview/unavailable states
  // never use it) and the plan-next mutation is a no-op spy.
  mockUseBudgetDashboardMonthQuery.mockReturnValue({
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  });
  mockUsePlanNextMonthMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
});

describe("NextMonthPreviewPage", () => {
  it("renders the backend preview figures and the estimated carry-over copy", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    // Preview state is visually + textually distinct, derived from the preview
    // year-month (not the active month) and labelled as a preview.
    const title = screen.getByTestId("next-month-preview-title");
    expect(title).toHaveTextContent(/june 2026/i);
    expect(screen.getByText(/preview .* nothing saved/i)).toBeInTheDocument();

    // Remaining anchor is the backend-authoritative finalBalanceWithCarryMonthly.
    expect(
      screen.getByTestId("next-month-preview-remaining"),
    ).toHaveTextContent(/34[\s,.]?623/);

    // Carry-over is shown as an estimate, finalised on close — never as final.
    const carry = screen.getByTestId("next-month-preview-carry-assumption");
    expect(carry).toHaveTextContent(/finalised when the month closes/i);
    expect(carry).toHaveTextContent(/may 2026/i);
  });

  it("preview offers only the start-planning action — no figure or month editing", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    // The preview is read-only money: the only action is the lifecycle
    // "start planning" CTA — there are no per-pillar edit controls (those
    // belong to the planned state) and no scoped edit-actions block.
    expect(
      screen.getByRole("button", { name: /start planning next month/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-edit-actions"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-edit-income"),
    ).not.toBeInTheDocument();

    // Navigation is still just the calm "back to overview" link.
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(/back to overview/i);
  });

  it("starts planning the next month from the open from-month", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUsePlanNextMonthMutation.mockReturnValue({ mutate, isPending: false });
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithOpenMonth("2026-05"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    await user.click(
      screen.getByRole("button", { name: /start planning next month/i }),
    );
    expect(
      screen.getByRole("dialog", { name: /create planned june 2026/i }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /create planned month/i }),
    );

    // Planning is keyed off the open from-month — never a fabricated month.
    expect(mutate).toHaveBeenCalledWith("2026-05");
  });

  it("renders the planned money state and scoped edit actions when next month is planned", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    // Planned numbers come from the materialized planned month, not the plan
    // projection — so the preview hook stays disabled in this state.
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(previewSuccess().dashboard),
    );

    renderPage();

    // Planned, not preview: distinct title + planned money state.
    const title = screen.getByTestId("next-month-planned-title");
    expect(title).toHaveTextContent(/june 2026/i);
    expect(screen.getAllByText(/^planned$/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId("next-month-planned-remaining")).toHaveTextContent(
      /34[\s,.]?623/,
    );

    // The planned dashboard is read for the planned month, enabled.
    expect(mockUseBudgetDashboardMonthQuery).toHaveBeenCalledWith(
      "2026-06",
      expect.objectContaining({ enabled: true }),
    );

    // Planned state reads the materialized month, never the plan projection:
    // the preview query stays disabled so it is not the active data source.
    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      "2026-05",
      expect.objectContaining({ enabled: false }),
    );

    // Scoped edit actions route into the PR-6 selected-month editors with the
    // planned ?yearMonth=, defaulting to next-month-only scope.
    expect(screen.getByTestId("next-month-edit-actions")).toBeInTheDocument();
    expect(
      screen.getByTestId("next-month-edit-income").getAttribute("href"),
    ).toContain("/dashboard/income?yearMonth=2026-06");
    expect(
      screen.getByTestId("next-month-edit-expenses").getAttribute("href"),
    ).toContain("/dashboard/expenses?yearMonth=2026-06");
    expect(
      screen.getByTestId("next-month-edit-savings").getAttribute("href"),
    ).toContain("/dashboard/savings?yearMonth=2026-06");
    expect(
      screen.getByTestId("next-month-edit-debts").getAttribute("href"),
    ).toContain("/dashboard/debts?yearMonth=2026-06");

    // Scope is unmistakable: month-only editing is separate from the
    // plan-forward note.
    expect(screen.getByText("Applies only to June 2026")).toBeInTheDocument();
    expect(
      screen.getByText("Need this change every month?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/budget plan forward/i)).toBeInTheDocument();
  });

  it("keeps a zero-total planned month editable — never the empty-plan state", () => {
    // A planned month is a real materialized month: it can validly start at
    // zero and must stay editable. The empty-plan guard is for the preview
    // projection only, so an all-zero planned month must NOT hide its actions.
    const zeroDashboard = {
      budgetId: "b1",
      income: {
        netSalaryMonthly: 0,
        incomePaymentDayType: null,
        incomePaymentDay: null,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: 0,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: { totalExpensesMonthly: 0, byCategory: [] },
      savings: {
        monthlySavings: 0,
        totalGoalSavingsMonthly: 0,
        totalSavingsMonthly: 0,
        isMonthOnly: false,
        goals: [],
      },
      debt: {
        totalDebtBalance: 0,
        totalMonthlyPayments: 0,
        debts: [],
        repaymentStrategy: null,
      },
      carryOverAmountMonthly: 0,
      disposableAfterExpensesWithCarryMonthly: 0,
      disposableAfterExpensesAndSavingsWithCarryMonthly: 0,
      finalBalanceWithCarryMonthly: 0,
      recurringExpenses: [],
      subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
    } as unknown as NextMonthPreviewDto["dashboard"];

    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(zeroDashboard),
    );

    renderPage();

    expect(screen.getByTestId("next-month-edit-actions")).toBeInTheDocument();
    expect(screen.getByTestId("next-month-edit-income")).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-empty"),
    ).not.toBeInTheDocument();
  });

  it("redirects to the dashboard when the next month is already a persisted open month", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithNextMonth("open"));
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));

    renderPage();

    // Defensive redirect — the page never invents open-month navigation.
    expect(
      screen.queryByTestId("next-month-preview-page"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-edit-actions"),
    ).not.toBeInTheDocument();
  });

  it("calls the preview hook with the open month from /months/status", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithOpenMonth("2026-05"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );

    renderPage();

    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      "2026-05",
      expect.objectContaining({ enabled: true }),
    );
  });

  it("shows the unavailable state when the preview is unavailable", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(
        previewSuccess({ state: "unavailable", dashboard: null }),
      ),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-unavailable"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
  });

  it("shows the empty-plan state when the preview projects an empty budget plan", () => {
    // A real preview (state: "preview") whose plan is empty: all four plan
    // components are zero. This must NOT fall through to a "0 kr / fully
    // assigned" money state.
    const emptyDashboard = {
      budgetId: "b1",
      income: {
        netSalaryMonthly: 0,
        incomePaymentDayType: null,
        incomePaymentDay: null,
        sideHustleMonthly: 0,
        householdMembersMonthly: 0,
        totalIncomeMonthly: 0,
        sideHustles: [],
        householdMembers: [],
      },
      expenditure: { totalExpensesMonthly: 0, byCategory: [] },
      savings: {
        monthlySavings: 0,
        totalGoalSavingsMonthly: 0,
        totalSavingsMonthly: 0,
        isMonthOnly: false,
        goals: [],
      },
      debt: {
        totalDebtBalance: 0,
        totalMonthlyPayments: 0,
        debts: [],
        repaymentStrategy: null,
      },
      carryOverAmountMonthly: 0,
      disposableAfterExpensesWithCarryMonthly: 0,
      disposableAfterExpensesAndSavingsWithCarryMonthly: 0,
      finalBalanceWithCarryMonthly: 0,
      recurringExpenses: [],
      subscriptions: { totalMonthlyAmount: 0, count: 0, items: [] },
    };

    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(
        previewSuccess({
          carryOver: {
            mode: "none",
            amount: 0,
            source: "none",
            isFinal: false,
          },
          dashboard:
            emptyDashboard as unknown as NextMonthPreviewDto["dashboard"],
        }),
      ),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-empty"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/fully assigned/i)).not.toBeInTheDocument();
  });

  it("shows the unavailable state when there is no open month to project from", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth(null));
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-unavailable"),
    ).toBeInTheDocument();
    // Preview hook stays disabled — no fabricated from-month.
    expect(mockUseNextMonthPreviewQuery).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("renders a skeleton while the preview is loading", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(undefined, { isPending: true }),
    );

    renderPage();

    expect(
      screen.getByTestId("next-month-preview-skeleton"),
    ).toBeInTheDocument();
  });

  it("renders the calm error panel when the preview query errors", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(undefined, { isError: true, error: new Error("boom") }),
    );

    renderPage();

    expect(
      screen.queryByTestId("next-month-preview-remaining"),
    ).not.toBeInTheDocument();
    // DashboardErrorState renders a heading + retry/reload controls.
    expect(
      screen.getByRole("heading", { name: /load the preview/i }),
    ).toBeInTheDocument();
  });

  it("disables the start-planning CTA while the create mutation is pending", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(statusWithOpenMonth());
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );
    mockUsePlanNextMonthMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    });

    renderPage();

    // Pending cannot double-submit: the CTA is disabled and shows progress.
    const cta = screen.getByRole("button", {
      name: /creating planned month/i,
    });
    expect(cta).toBeDisabled();
  });

  it("surfaces a retryable error when the create mutation fails", async () => {
    const user = userEvent.setup();
    const mutate = vi.fn();
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithOpenMonth("2026-05"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(
      previewQueryState(previewSuccess()),
    );
    mockUsePlanNextMonthMutation.mockReturnValue({
      mutate,
      isPending: false,
      isError: true,
      error: new Error("create failed"),
      isSuccess: false,
    });

    renderPage();

    // A failed lifecycle mutation is never silent: stay in preview, show an
    // alert near the action, and turn the CTA into an explicit retry.
    expect(
      screen.getByTestId("next-month-start-planning-error"),
    ).toBeInTheDocument();
    const retry = screen.getByRole("button", { name: /try again/i });
    await user.click(retry);
    expect(mutate).toHaveBeenCalledWith("2026-05");
  });

  it("shows the success ribbon right after the planned month is created", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(previewSuccess().dashboard),
    );
    mockUsePlanNextMonthMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
    });

    renderPage();

    const ribbon = screen.getByTestId("next-month-planned-success");
    expect(ribbon).toHaveTextContent(/june 2026 is planned/i);
    expect(ribbon).toHaveTextContent(/adjust the month before it opens/i);

    // The success banner is a deterministic, programmatic focus target: after
    // the create transition, focus lands on it so keyboard and screen-reader
    // users are taken straight to the confirmation and the edit hub below it.
    expect(ribbon).toHaveAttribute("tabindex", "-1");
    expect(ribbon).toHaveAttribute(
      "aria-labelledby",
      "next-month-planned-success-title",
    );
    expect(ribbon).toHaveFocus();
  });

  it("does not steal focus when revisiting an already-planned month", () => {
    // No success this session (default mutation mock): the calm planned state
    // must not yank focus to the body on a direct revisit.
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(previewSuccess().dashboard),
    );

    renderPage();

    expect(
      screen.queryByTestId("next-month-planned-success"),
    ).not.toBeInTheDocument();
    // Focus is left on the document body — nothing was programmatically grabbed.
    expect(document.body).toHaveFocus();
  });

  it("keeps the route on /dashboard/next-month after a successful create", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(previewSuccess().dashboard),
    );
    mockUsePlanNextMonthMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: true,
    });

    renderPage();

    // Rendering the planned+success state does not navigate or reload: the
    // page stays mounted at /dashboard/next-month. (The click→mutation path
    // itself is covered by the "starts planning" test; this guards only that
    // reaching success never swaps the route out from under the user.)
    expect(screen.getByTestId("location-probe")).toHaveTextContent(
      "/dashboard/next-month",
    );
    expect(screen.getByTestId("next-month-preview-page")).toBeInTheDocument();
    expect(
      screen.getByTestId("next-month-planned-success"),
    ).toBeInTheDocument();
  });

  it("hides the success ribbon for an already-planned month", () => {
    mockUseBudgetMonthsStatusQuery.mockReturnValue(
      statusWithNextMonth("planned"),
    );
    mockUseNextMonthPreviewQuery.mockReturnValue(previewQueryState(undefined));
    mockUseBudgetDashboardMonthQuery.mockReturnValue(
      dashboardMonthState(previewSuccess().dashboard),
    );
    // Default mutation mock: isSuccess is falsy — nothing was created here, so
    // the calm planned state shows no success moment, only the edit hub.

    renderPage();

    expect(
      screen.queryByTestId("next-month-planned-success"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("next-month-edit-actions")).toBeInTheDocument();
  });
});
