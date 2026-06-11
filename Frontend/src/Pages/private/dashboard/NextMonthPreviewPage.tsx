import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import AllocationBar, {
  ALLOCATION_SEGMENT_BAR_CLASS,
  getVisibleAllocationSegments,
  type AllocationBarLabels,
  type AllocationSegmentKey,
} from "@/components/molecules/budget/AllocationBar";
import { Pill } from "@/components/atoms/badges/Pill";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import ContentWrapper from "@components/layout/ContentWrapper";
import PageContainer from "@components/layout/PageContainer";
import { buildTermsFromLiveDashboard } from "@/domain/budget/dashboardTerms";
import {
  classifyRemaining,
  deriveNextMonthPageState,
  isEmptyPlanDashboard,
  ymLabel,
} from "@/domain/budget/nextMonthPreview";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useNextMonthPreviewQuery } from "@/hooks/budget/useNextMonthPreviewQuery";
import { usePlanNextMonthMutation } from "@/hooks/budget/usePlanNextMonthMutation";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { useAuthStore } from "@/stores/Auth/authStore";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { toApiProblem } from "@/api/toApiProblem";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { dashboardErrorStateDict } from "@/utils/i18n/pages/private/dashboard/DashboardErrorState.i18n";
import { nextMonthPreviewDict } from "@/utils/i18n/pages/private/dashboard/pages/NextMonthPreviewPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

type Translate = <K extends keyof typeof nextMonthPreviewDict.sv>(
  k: K,
) => string;

const NextMonthPreviewPage: React.FC = () => {
  const locale = useAppLocale();
  const t: Translate = (k) => tDict(k, locale, nextMonthPreviewDict);
  const tError = <K extends keyof typeof dashboardErrorStateDict.sv>(
    k: K,
  ): string => tDict(k, locale, dashboardErrorStateDict);

  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const monthsQ = useBudgetMonthsStatusQuery({ enabled: !firstLogin });
  const status = monthsQ.data ?? null;

  // The page derives its real state — preview or planned — from the persisted
  // months. `open` is a defensive case only (a real next month already exists);
  // we redirect rather than invent next-month navigation. `unavailable` covers
  // "no open month to project from".
  const pageState = deriveNextMonthPageState({
    openMonthYearMonth: status?.openMonthYearMonth,
    months: status?.months,
  });
  const isPreview = pageState.kind === "preview";
  const isPlanned = pageState.kind === "planned";

  // Both data hooks run unconditionally with enabled gates so hook order stays
  // stable across states. Preview reads the budget-plan projection; planned
  // reads the materialized planned month (its edited rows, never the plan
  // projection) through the same dashboard endpoint the live month uses.
  const previewQ = useNextMonthPreviewQuery(pageState.fromYearMonth, {
    enabled: !firstLogin && isPreview,
  });
  const plannedDashQ = useBudgetDashboardMonthQuery(
    isPlanned ? pageState.targetYearMonth : null,
    { enabled: !firstLogin && isPlanned },
  );
  const planMutation = usePlanNextMonthMutation();

  const shell = (children: React.ReactNode) => (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
        <div
          data-testid="next-month-preview-page"
          className="w-full max-w-3xl space-y-5 px-4 py-6"
        >
          <Link
            to={appRoutes.dashboard}
            className="inline-flex items-center gap-2 text-sm font-medium text-eb-text/65 hover:text-eb-text transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("back")}
          </Link>
          {children}
        </div>
      </ContentWrapper>
    </PageContainer>
  );

  const infoPanel = (testId: string, title: string, body: string) =>
    shell(
      <section
        data-testid={testId}
        className={cn(
          "relative overflow-hidden rounded-3xl shadow-eb",
          "border border-eb-stroke/40 bg-eb-surface/85",
          "supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:bg-eb-surface/70",
          "px-5 py-6 sm:px-7 sm:py-7",
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
            {t("kicker")}
          </span>
          <Pill className="h-7 px-2.5 text-xs">{t("previewBadge")}</Pill>
        </div>
        <h1 className="mt-2 text-xl font-extrabold tracking-tight text-eb-text">
          {title}
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-6 text-eb-text/70">
          {body}
        </p>
      </section>,
    );

  const unavailable = () =>
    infoPanel(
      "next-month-preview-unavailable",
      t("unavailableTitle"),
      t("unavailableBody"),
    );

  const emptyPlan = () =>
    infoPanel("next-month-preview-empty", t("emptyTitle"), t("emptyBody"));

  const errorPanel = (
    message: string,
    onRetry: () => void,
  ): React.ReactNode =>
    shell(
      <DashboardErrorState
        title={t("errorTitle")}
        message={message}
        onRetry={onRetry}
        retryLabel={tError("retry")}
        reloadLabel={tError("reload")}
      />,
    );

  if (firstLogin) {
    return unavailable();
  }

  // Months status must resolve before we know the from-month and page state.
  if (monthsQ.isPending) {
    return shell(<PreviewSkeleton />);
  }
  if (monthsQ.isError) {
    return errorPanel(
      monthsQ.error
        ? toUserMessage(toApiProblem(monthsQ.error), locale)
        : t("errorFallback"),
      monthsQ.refetch,
    );
  }

  // No open month to project from — honest unavailable state, never a fake number.
  if (pageState.kind === "unavailable") {
    return unavailable();
  }

  // Defensive only: a real persisted next month already exists. The next-month
  // page is for preview/planned; send the user to the dashboard to navigate
  // persisted months rather than inventing routing here.
  if (pageState.kind === "open") {
    return <Navigate to={appRoutes.dashboard} replace />;
  }

  if (pageState.kind === "planned") {
    if (plannedDashQ.isPending) {
      return shell(<PreviewSkeleton />);
    }
    if (plannedDashQ.isError) {
      return errorPanel(
        plannedDashQ.error
          ? toUserMessage(toApiProblem(plannedDashQ.error), locale)
          : t("errorFallback"),
        plannedDashQ.refetch,
      );
    }

    // A planned month is a real materialized month, not a projection: zero
    // rows/totals are a valid starting point the user must still be able to
    // edit. The empty-plan guard is for the preview projection only — never
    // apply it here, or an all-zero planned month would hide its edit actions.
    const dashboard = plannedDashQ.data?.liveDashboard ?? null;
    if (!dashboard) {
      return unavailable();
    }

    return shell(
      <PlannedContent
        dashboard={dashboard}
        currency={plannedDashQ.data!.currencyCode}
        targetYearMonth={pageState.targetYearMonth}
        locale={locale}
        t={t}
      />,
    );
  }

  // preview
  if (previewQ.isPending) {
    return shell(<PreviewSkeleton />);
  }
  if (previewQ.isError) {
    return errorPanel(
      previewQ.error
        ? toUserMessage(toApiProblem(previewQ.error), locale)
        : t("errorFallback"),
      previewQ.refetch,
    );
  }

  const preview = previewQ.data;
  if (!preview || preview.state !== "preview" || !preview.dashboard) {
    return unavailable();
  }

  // A real preview from an empty budget plan would render "0 kr / fully
  // assigned" — honest-looking but meaningless. Show a setup state instead.
  if (isEmptyPlanDashboard(preview.dashboard)) {
    return emptyPlan();
  }

  return shell(
    <PreviewContent
      dashboard={preview.dashboard}
      currency={preview.currencyCode}
      previewYearMonth={preview.previewYearMonth}
      fromYearMonth={preview.fromYearMonth}
      showCarryAssumption={preview.carryOver.mode === "estimatedFull"}
      carryAmount={preview.carryOver.amount}
      locale={locale}
      t={t}
      onStartPlanning={() => planMutation.mutate(preview.fromYearMonth)}
      planning={planMutation.isPending}
    />,
  );
};

/**
 * The backend-authoritative six-term money state — the same equation grammar as
 * the live dashboard's MoneyState, fed by the shared `buildTermsFromLiveDashboard`.
 * Remaining is read straight from the backend projection; nothing is computed
 * for display. Reused by both the preview and the planned states.
 */
function MoneyStateSurface({
  dashboard,
  currency,
  locale,
  t,
  testIdBase,
  footer,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  locale: string;
  t: Translate;
  testIdBase: string;
  footer?: React.ReactNode;
}) {
  const { terms } = buildTermsFromLiveDashboard(dashboard);
  const tone = classifyRemaining(terms.remaining);
  const labelId = `${testIdBase}-remaining-label`;

  const fmt = (value: number) => {
    const abs = Math.abs(value);
    return formatMoneyV2(abs, currency, locale, {
      fractionDigits: moneyDecimalsFor(abs),
    });
  };

  const toneWord =
    tone === "positive"
      ? t("toneWordPositive")
      : tone === "negative"
        ? t("toneWordNegative")
        : t("toneWordZero");

  const helperCopy =
    tone === "positive"
      ? t("helperPositive")
      : tone === "negative"
        ? t("helperNegative")
        : t("helperZero");

  const allocationLabels: AllocationBarLabels = {
    ariaLabel: t("allocationAria"),
    expenses: t("allocationExpenses"),
    savings: t("allocationSavings"),
    debts: t("allocationDebts"),
    free: t("allocationFree"),
    unfunded: t("allocationUnfunded"),
    runsOutMarker: t("allocationRunsOut"),
  };

  const allocationTerms = {
    expenses: terms.expenses,
    savings: terms.savings,
    debts: terms.debts,
    remaining: terms.remaining,
  };
  const legendSegments = getVisibleAllocationSegments(allocationTerms);
  const segmentLabel: Record<AllocationSegmentKey, string> = {
    expenses: allocationLabels.expenses,
    savings: allocationLabels.savings,
    debts: allocationLabels.debts,
    free: allocationLabels.free,
  };

  const equationTerms: Array<{
    key: string;
    label: string;
    value: number;
    operator: "plus" | "minus" | null;
  }> = [
    { key: "income", label: t("equationIncome"), value: terms.income, operator: null },
    {
      key: "carryOver",
      label: t("equationCarryOver"),
      value: terms.carryOver,
      operator: "plus",
    },
    {
      key: "expenses",
      label: t("equationExpenses"),
      value: terms.expenses,
      operator: "minus",
    },
    {
      key: "savings",
      label: t("equationSavings"),
      value: terms.savings,
      operator: "minus",
    },
    {
      key: "debts",
      label: t("equationDebts"),
      value: terms.debts,
      operator: "minus",
    },
  ];

  return (
    <section
      data-testid={testIdBase}
      data-tone={tone}
      aria-labelledby={labelId}
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-eb",
        "border border-eb-stroke/40 bg-eb-surface/85",
        "bg-[linear-gradient(180deg,rgb(var(--eb-shell)/0.18),transparent_46%)]",
        "supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:bg-eb-surface/70",
        "px-5 py-6 sm:px-7 sm:py-7",
        tone === "negative" && "border-eb-danger/40",
      )}
    >
      <p
        id={labelId}
        className="text-xs font-semibold uppercase tracking-wide text-eb-text/55"
      >
        {t("remainingLabel")}
      </p>
      <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
        <p
          data-testid={`${testIdBase}-remaining`}
          className={cn(
            "text-[2.5rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-5xl",
            tone === "negative" ? "text-eb-danger" : "text-eb-text",
          )}
        >
          {tone === "negative" ? "−" : ""}
          {fmt(terms.remaining)}
        </p>
        <p
          className={cn(
            "text-base font-bold sm:text-lg",
            tone === "negative" ? "text-eb-danger" : "text-eb-text/55",
          )}
        >
          {toneWord}
        </p>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-eb-text/70">
        {helperCopy}
      </p>

      <div
        data-testid={`${testIdBase}-equation`}
        role="group"
        aria-label={t("equationAria")}
        className="mt-5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-xs leading-5 text-eb-text/60"
      >
        {equationTerms.map((term) => (
          <React.Fragment key={term.key}>
            {term.operator ? (
              <span aria-hidden="true" className="font-semibold text-eb-text/40">
                {term.operator === "plus" ? t("equationPlus") : t("equationMinus")}
              </span>
            ) : null}
            <span className="inline-flex items-baseline gap-1.5">
              <span className="text-eb-text/55">{term.label}</span>
              <span className="font-semibold tabular-nums text-eb-text/85">
                {fmt(term.value)}
              </span>
            </span>
          </React.Fragment>
        ))}
        <span aria-hidden="true" className="font-semibold text-eb-text/40">
          {t("equationEquals")}
        </span>
        <span className="inline-flex items-baseline gap-1.5">
          <span className="text-eb-text/55">{t("equationRemaining")}</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              tone === "negative" ? "text-eb-danger" : "text-eb-text",
            )}
          >
            {tone === "negative" ? "−" : ""}
            {fmt(terms.remaining)}
          </span>
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
          {t("allocationCaption")}
        </p>
        {legendSegments.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {legendSegments.map((segment) => (
              <li key={segment.key} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-[3px]",
                    ALLOCATION_SEGMENT_BAR_CLASS[segment.key],
                  )}
                />
                <span className="text-[11px] font-semibold text-eb-text/60">
                  {segmentLabel[segment.key]}
                </span>
                <span className="text-[11px] font-bold tabular-nums text-eb-text">
                  {fmt(segment.amount)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2.5">
          <AllocationBar
            terms={allocationTerms}
            labels={allocationLabels}
            testId={`${testIdBase}-allocation`}
          />
        </div>
      </div>

      {footer ? (
        <div className="mt-6 space-y-1.5 border-t border-eb-stroke/40 pt-4 text-xs leading-5 text-eb-text/55">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

function PreviewContent({
  dashboard,
  currency,
  previewYearMonth,
  fromYearMonth,
  showCarryAssumption,
  carryAmount,
  locale,
  t,
  onStartPlanning,
  planning,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  previewYearMonth: string;
  fromYearMonth: string;
  showCarryAssumption: boolean;
  carryAmount: number;
  locale: string;
  t: Translate;
  onStartPlanning: () => void;
  planning: boolean;
}) {
  const previewLabel = ymLabel(previewYearMonth, locale);
  const fromLabel = ymLabel(fromYearMonth, locale);

  const carryCopy = t("carryAssumption")
    .replace("{month}", fromLabel)
    .replace(
      "{amount}",
      formatMoneyV2(Math.abs(carryAmount), currency, locale, {
        fractionDigits: moneyDecimalsFor(Math.abs(carryAmount)),
      }),
    );

  return (
    <>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
            {t("kicker")}
          </span>
          <Pill className="h-7 px-2.5 text-xs">{t("previewBadge")}</Pill>
        </div>
        <h1
          data-testid="next-month-preview-title"
          className="text-2xl font-extrabold capitalize tracking-tight text-eb-text sm:text-3xl"
        >
          {previewLabel} {t("titleSeparator")} {t("previewBadge")}
        </h1>
        <p className="max-w-prose text-sm leading-6 text-eb-text/70">
          {t("intro")}
        </p>
      </header>

      <MoneyStateSurface
        dashboard={dashboard}
        currency={currency}
        locale={locale}
        t={t}
        testIdBase="next-month-preview"
        footer={
          <>
            <p>{t("basisNote")}</p>
            {showCarryAssumption ? (
              <p data-testid="next-month-preview-carry-assumption">
                {carryCopy}
              </p>
            ) : null}
          </>
        }
      />

      {/*
        Creating the planned month is the one lifecycle action offered from the
        read-only preview. It edits nothing here — it materializes next month so
        it can be edited ahead of time, after which the page renders the planned
        state with its scoped edit actions.
      */}
      <section
        data-testid="next-month-start-planning"
        className={cn(
          "rounded-3xl border border-eb-stroke/40 bg-eb-surface/70",
          "px-5 py-5 sm:px-7 sm:py-6",
        )}
      >
        <h2 className="text-base font-extrabold tracking-tight text-eb-text">
          {t("startPlanningTitle")}
        </h2>
        <p className="mt-1.5 max-w-prose text-sm leading-6 text-eb-text/70">
          {t("startPlanningBody")}
        </p>
        <CtaButton
          className="mt-4 h-11 px-5"
          onClick={onStartPlanning}
          disabled={planning}
        >
          {planning ? t("startPlanningPending") : t("startPlanningAction")}
        </CtaButton>
      </section>
    </>
  );
}

function PlannedContent({
  dashboard,
  currency,
  targetYearMonth,
  locale,
  t,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  targetYearMonth: string;
  locale: string;
  t: Translate;
}) {
  const plannedLabel = ymLabel(targetYearMonth, locale);
  const monthOnlyScope = t("monthOnlyScope").replace("{month}", plannedLabel);
  const qs = `?yearMonth=${encodeURIComponent(targetYearMonth)}`;

  const pillars: Array<{ key: string; label: string; to: string }> = [
    { key: "income", label: t("editIncome"), to: `${appRoutes.income}${qs}` },
    {
      key: "expenses",
      label: t("editExpenses"),
      to: `${appRoutes.expenses}${qs}`,
    },
    { key: "savings", label: t("editSavings"), to: `${appRoutes.savings}${qs}` },
    { key: "debts", label: t("editDebts"), to: `${appRoutes.debts}${qs}` },
  ];

  return (
    <>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
            {t("kicker")}
          </span>
          <Pill className="h-7 px-2.5 text-xs">{t("plannedBadge")}</Pill>
        </div>
        <h1
          data-testid="next-month-planned-title"
          className="text-2xl font-extrabold capitalize tracking-tight text-eb-text sm:text-3xl"
        >
          {plannedLabel} {t("titleSeparator")} {t("plannedBadge")}
        </h1>
        <p className="max-w-prose text-sm leading-6 text-eb-text/70">
          {t("plannedIntro")}
        </p>
      </header>

      <MoneyStateSurface
        dashboard={dashboard}
        currency={currency}
        locale={locale}
        t={t}
        testIdBase="next-month-planned"
      />

      {/*
        Scope is the load-bearing risk here: "edit next month only" must never
        be confused with "change the budget plan forward". The default editor
        scope for the planned month is month-only; plan-forward is a deliberate
        per-row choice inside the editor, surfaced as a separate explanation —
        never as the same action.
      */}
      <section
        data-testid="next-month-edit-actions"
        className={cn(
          "rounded-3xl border border-eb-stroke/40 bg-eb-surface/70",
          "px-5 py-5 sm:px-7 sm:py-6",
        )}
      >
        <h2 className="text-base font-extrabold tracking-tight text-eb-text">
          {t("editActionsTitle")}
        </h2>

        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-eb-text">
              {t("editNextMonthOnlyTitle")}
            </span>
            <Pill className="h-6 px-2 text-[11px] font-semibold">
              {monthOnlyScope}
            </Pill>
          </div>
          <p className="mt-1.5 max-w-prose text-sm leading-6 text-eb-text/65">
            {t("editNextMonthOnlyBody")}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {pillars.map((pillar) => (
              <li key={pillar.key}>
                <Link
                  to={pillar.to}
                  data-testid={`next-month-edit-${pillar.key}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-2xl",
                    "border border-eb-stroke/40 bg-eb-surface/80 px-3.5 py-3",
                    "text-sm font-semibold text-eb-text",
                    "hover:border-eb-accent/45 hover:bg-eb-surface transition",
                  )}
                >
                  {pillar.label}
                  <ArrowRight className="h-4 w-4 text-eb-text/45" />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 border-t border-eb-stroke/40 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-eb-text">
              {t("updatePlanForwardTitle")}
            </span>
            <Pill className="h-6 px-2 text-[11px] font-semibold">
              {t("planForwardScope")}
            </Pill>
          </div>
          <p className="mt-1.5 max-w-prose text-sm leading-6 text-eb-text/65">
            {t("updatePlanForwardBody")}
          </p>
        </div>
      </section>
    </>
  );
}

function PreviewSkeleton() {
  return (
    <div
      data-testid="next-month-preview-skeleton"
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-eb",
        "border border-eb-stroke/40 bg-eb-surface/85",
        "px-5 py-6 sm:px-7 sm:py-7",
      )}
    >
      <div className="h-3 w-24 animate-pulse rounded bg-eb-stroke/40" />
      <div className="mt-3 h-10 w-56 animate-pulse rounded bg-eb-stroke/40" />
      <div className="mt-4 h-3 w-full max-w-md animate-pulse rounded bg-eb-stroke/30" />
      <div className="mt-6 h-3.5 w-full animate-pulse rounded-full bg-eb-stroke/30" />
    </div>
  );
}

export default NextMonthPreviewPage;
