import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  CreditCard,
  Info,
  Layers3,
  Lock,
  PiggyBank,
  ReceiptText,
  SlidersHorizontal,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
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
import PageContainer from "@components/layout/PageContainer";
import { buildTermsFromLiveDashboard } from "@/domain/budget/dashboardTerms";
import {
  buildNextMonthDeltas,
  classifyRemaining,
  deriveNextMonthPageState,
  isEmptyPlanDashboard,
  ymLabel,
  type NextMonthDelta,
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

const surfaceClass = cn(
  "relative overflow-hidden rounded-[24px] border border-eb-stroke/40 bg-eb-surface/85 shadow-eb",
  "supports-[backdrop-filter]:backdrop-blur-md supports-[backdrop-filter]:bg-eb-surface/75",
);

function formatMoneyDisplay(
  value: number,
  currency: CurrencyCode,
  locale: string,
) {
  const abs = Math.abs(value);
  return formatMoneyV2(abs, currency, locale, {
    fractionDigits: moneyDecimalsFor(abs),
  });
}

function StatePill({
  icon: Icon,
  label,
  tone = "surface",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: "surface" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
        tone === "accent"
          ? "border-eb-accent/35 bg-eb-accentSoft/70 text-eb-text"
          : "border-eb-stroke/35 bg-eb-surface/75 text-eb-text/70",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function NextMonthHeader({
  monthLabel,
  pill,
  body,
  titleTestId,
  t,
}: {
  monthLabel: string;
  pill: React.ReactNode;
  body: string | null;
  titleTestId?: string;
  t: Translate;
}) {
  return (
    <header data-testid="next-month-page-header" className="mb-5 sm:mb-6">
      <Link
        to={appRoutes.dashboard}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-eb-text/55 transition hover:text-eb-text"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/55">
            {t("kicker")}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1
              data-testid={titleTestId}
              className="text-3xl font-extrabold capitalize tracking-tight text-eb-text sm:text-[2rem]"
            >
              {monthLabel}
            </h1>
            {pill}
          </div>
          {body ? (
            <p className="mt-2 max-w-xl text-sm leading-6 text-eb-text/65">
              {body}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function WorkspaceGrid({
  main,
  aside,
}: {
  main: React.ReactNode;
  aside: React.ReactNode;
}) {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <div className="min-w-0 space-y-5">{main}</div>
      <aside className="min-w-0 space-y-5">{aside}</aside>
    </div>
  );
}

function SupportGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 md:grid-cols-2">{children}</div>;
}

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
  const [confirmPlanningOpen, setConfirmPlanningOpen] = useState(false);

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
  const currentDashQ = useBudgetDashboardMonthQuery(
    pageState.fromYearMonth,
    {
      enabled:
        !firstLogin &&
        (isPreview || isPlanned) &&
        pageState.fromYearMonth !== null,
    },
  );
  const planMutation = usePlanNextMonthMutation();

  useEffect(() => {
    if (planMutation.isError || planMutation.isSuccess) {
      setConfirmPlanningOpen(false);
    }
  }, [planMutation.isError, planMutation.isSuccess]);

  const shell = (children: React.ReactNode) => (
    <PageContainer
      padY="none"
      className="relative min-h-screen overflow-x-hidden"
    >
      <div
        data-testid="next-month-preview-page"
        className="relative mx-auto w-full max-w-[1080px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10"
      >
        {children}
      </div>
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
    return shell(
      <>
        <NextMonthHeader
          monthLabel={t("kicker")}
          pill={null}
          body={null}
          t={t}
        />
        <LoadingWorkspace />
      </>,
    );
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
      return shell(
        <>
          <NextMonthHeader
            monthLabel={ymLabel(pageState.targetYearMonth, locale)}
            pill={
              <StatePill
                icon={CheckCircle2}
                label={t("plannedBadge")}
                tone="accent"
              />
            }
            body={t("plannedIntro")}
            t={t}
          />
          <LoadingWorkspace />
        </>,
      );
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
        currentDashboard={currentDashQ.data?.liveDashboard ?? null}
        currency={plannedDashQ.data!.currencyCode}
        fromYearMonth={pageState.fromYearMonth}
        targetYearMonth={pageState.targetYearMonth}
        locale={locale}
        t={t}
        justPlanned={planMutation.isSuccess}
      />,
    );
  }

  // preview
  if (previewQ.isPending) {
    return shell(
      <>
        <NextMonthHeader
          monthLabel={ymLabel(pageState.targetYearMonth, locale)}
          pill={<StatePill icon={Sparkles} label={t("previewNothingSaved")} />}
          body={t("intro")}
          t={t}
        />
        <LoadingWorkspace />
      </>,
    );
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
      currentDashboard={currentDashQ.data?.liveDashboard ?? null}
      locale={locale}
      t={t}
      onStartPlanning={() => setConfirmPlanningOpen(true)}
      onConfirmPlanning={() => planMutation.mutate(preview.fromYearMonth)}
      confirmPlanningOpen={confirmPlanningOpen}
      onCloseConfirm={() => setConfirmPlanningOpen(false)}
      planning={planMutation.isPending}
      planError={
        planMutation.isError
          ? planMutation.error
            ? toUserMessage(toApiProblem(planMutation.error), locale)
            : t("startPlanningError")
          : null
      }
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
  mode,
  monthLabel,
  footer,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  locale: string;
  t: Translate;
  testIdBase: string;
  mode: "preview" | "planned";
  monthLabel: string;
  footer?: React.ReactNode;
}) {
  const { terms } = buildTermsFromLiveDashboard(dashboard);
  const tone = classifyRemaining(terms.remaining);
  const labelId = `${testIdBase}-remaining-label`;

  const fmt = (value: number) => formatMoneyDisplay(value, currency, locale);

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
        surfaceClass,
        "bg-[linear-gradient(180deg,rgb(var(--eb-shell)/0.18),transparent_46%)]",
        "px-5 py-6 sm:px-7",
        tone === "negative" && "border-eb-danger/40",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p
            id={labelId}
            className={cn(
              "text-xs font-semibold uppercase tracking-wide",
              tone === "negative" ? "text-eb-danger/80" : "text-eb-text/55",
            )}
          >
            {tone === "negative"
              ? t("shortInMonth").replace("{month}", monthLabel)
              : t("freeInMonth").replace("{month}", monthLabel)}
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {mode === "preview" ? (
              <span className="text-3xl font-extrabold leading-none text-eb-text/45">
                ≈
              </span>
            ) : null}
            <p
              data-testid={`${testIdBase}-remaining`}
              className={cn(
                "text-[2.6rem] font-extrabold leading-none tracking-tight tabular-nums sm:text-5xl",
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
        </div>
        <Pill className="h-8 shrink-0 px-3 text-xs">
          <Layers3 className="mr-1.5 h-3.5 w-3.5" />
          {t("fromBudgetPlan")}
        </Pill>
      </div>
      <p className="mt-2 max-w-xl text-sm leading-6 text-eb-text/70">
        {helperCopy}
      </p>

      <div
        data-testid={`${testIdBase}-equation`}
        role="group"
        aria-label={t("equationAria")}
        className="mt-5 flex flex-wrap items-stretch gap-x-2.5 gap-y-2 text-xs leading-5 text-eb-text/60"
      >
        {equationTerms.map((term) => (
          <React.Fragment key={term.key}>
            {term.operator ? (
              <span aria-hidden="true" className="font-semibold text-eb-text/40">
                {term.operator === "plus" ? t("equationPlus") : t("equationMinus")}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex flex-col gap-0.5 rounded-[10px] px-1.5 py-1",
                term.key === "carryOver" &&
                  mode === "preview" &&
                  "border border-eb-warning/30 bg-eb-warning/10",
              )}
            >
              <span className="text-[10.5px] font-bold uppercase tracking-wide text-eb-text/45">
                {term.label}
                {term.key === "carryOver" && mode === "preview" ? (
                  <span className="ml-1 normal-case tracking-normal">
                    {t("estimatedAbbr")}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums text-eb-text/85">
                {term.key === "carryOver" && mode === "preview" ? "≈" : ""}
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

function ComparisonPanel({
  currentDashboard,
  targetDashboard,
  currency,
  locale,
  currentYearMonth,
  targetYearMonth,
  t,
}: {
  currentDashboard: BudgetDashboardDto | null;
  targetDashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  locale: string;
  currentYearMonth: string;
  targetYearMonth: string;
  t: Translate;
}) {
  const [open, setOpen] = useState(true);
  const targetTerms = buildTermsFromLiveDashboard(targetDashboard).terms;
  const currentTerms = currentDashboard
    ? buildTermsFromLiveDashboard(currentDashboard).terms
    : null;
  const deltas = currentTerms
    ? buildNextMonthDeltas(currentTerms, targetTerms).filter((d) => !d.isZero)
    : null;
  const currentLabel = ymLabel(currentYearMonth, locale);
  const targetLabel = ymLabel(targetYearMonth, locale);

  return (
    <section
      data-testid="next-month-comparison"
      className={cn(surfaceClass, "px-5 py-4")}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-xs font-semibold uppercase tracking-wide text-eb-text/50">
            {t("comparisonKicker").replace("{month}", currentLabel)}
          </span>
          <span className="mt-1 block text-sm font-extrabold text-eb-text">
            {t("comparisonTitle").replace("{month}", targetLabel)}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-eb-text/50">
          {deltas
            ? t("comparisonCount").replace("{count}", String(deltas.length))
            : t("termsCount")}
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-180",
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-3">
          {deltas ? (
            deltas.length > 0 ? (
              deltas.map((delta) => (
                <DeltaRow
                  key={delta.key}
                  delta={delta}
                  currency={currency}
                  locale={locale}
                  t={t}
                />
              ))
            ) : (
              <p className="text-sm leading-6 text-eb-text/60">
                {t("comparisonNoChanges")}
              </p>
            )
          ) : (
            <TermSummary
              dashboard={targetDashboard}
              currency={currency}
              locale={locale}
              t={t}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}

function DeltaRow({
  delta,
  currency,
  locale,
  t,
}: {
  delta: NextMonthDelta;
  currency: CurrencyCode;
  locale: string;
  t: Translate;
}) {
  const positive = delta.delta > 0;
  const signed = `${positive ? "+" : "−"}${formatMoneyDisplay(
    Math.abs(delta.delta),
    currency,
    locale,
  )}`;
  const labelKey: Record<NextMonthDelta["key"], keyof typeof nextMonthPreviewDict.sv> = {
    income: "delta_income",
    carryOver: "delta_carryOver",
    expenses: "delta_expenses",
    savings: "delta_savings",
    debts: "delta_debts",
  };

  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3">
      <span
        className={cn(
          "text-right text-sm font-extrabold tabular-nums",
          positive ? "text-eb-accent" : "text-eb-danger",
        )}
      >
        {signed}
      </span>
      <span className="text-sm leading-5 text-eb-text/65">
        {t(labelKey[delta.key])}
      </span>
    </div>
  );
}

function TermSummary({
  dashboard,
  currency,
  locale,
  t,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  locale: string;
  t: Translate;
}) {
  const { terms } = buildTermsFromLiveDashboard(dashboard);
  const rows: Array<{ key: keyof typeof terms; label: string }> = [
    { key: "income", label: t("equationIncome") },
    { key: "carryOver", label: t("equationCarryOver") },
    { key: "expenses", label: t("equationExpenses") },
    { key: "savings", label: t("equationSavings") },
    { key: "debts", label: t("equationDebts") },
  ];

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-baseline justify-between gap-3 text-sm"
        >
          <span className="text-eb-text/60">{row.label}</span>
          <span className="font-bold tabular-nums text-eb-text">
            {formatMoneyDisplay(terms[row.key], currency, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

function LifecyclePanel({
  stage,
  fromYearMonth,
  targetYearMonth,
  locale,
  t,
}: {
  stage: "preview" | "planned";
  fromYearMonth: string;
  targetYearMonth: string;
  locale: string;
  t: Translate;
}) {
  const fromLabel = ymLabel(fromYearMonth, locale);
  const targetLabel = ymLabel(targetYearMonth, locale);
  const activeIndex = stage === "planned" ? 1 : 0;
  const steps = [
    {
      id: "preview",
      title: t("lifecyclePreviewTitle"),
      body: t("lifecyclePreviewBody"),
    },
    {
      id: "planned",
      title: t("lifecyclePlannedTitle"),
      body: t("lifecyclePlannedBody").replace("{month}", targetLabel),
    },
    {
      id: "open",
      title: t("lifecycleOpenTitle"),
      body: t("lifecycleOpenBody")
        .replace("{from}", fromLabel)
        .replace("{month}", targetLabel),
    },
  ];

  return (
    <section
      data-testid="next-month-lifecycle"
      className={cn(surfaceClass, "px-5 py-4")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
        {t("lifecycleKicker").replace("{month}", targetLabel)}
      </p>
      <div className="mt-4 space-y-0">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          return (
            <div
              key={step.id}
              className="grid grid-cols-[24px_minmax(0,1fr)] gap-3"
            >
              <span className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border",
                    done || current
                      ? "border-eb-accent/45 bg-eb-accentSoft text-eb-accent"
                      : "border-eb-stroke/50 bg-eb-shell/35 text-eb-text/35",
                  )}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>
                {index < steps.length - 1 ? (
                  <span className="h-10 w-px bg-eb-stroke/50" />
                ) : null}
              </span>
              <span className="pb-4">
                <span
                  className={cn(
                    "block text-sm font-extrabold",
                    current ? "text-eb-text" : "text-eb-text/65",
                  )}
                >
                  {step.title}
                </span>
                <span className="mt-1 block text-xs leading-5 text-eb-text/55">
                  {step.body}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StartPlanningPanel({
  dashboard,
  currency,
  locale,
  monthLabel,
  fromLabel,
  t,
  onStartPlanning,
  onRetryPlanning,
  planning,
  planError,
}: {
  dashboard: BudgetDashboardDto;
  currency: CurrencyCode;
  locale: string;
  monthLabel: string;
  fromLabel: string;
  t: Translate;
  onStartPlanning: () => void;
  onRetryPlanning: () => void;
  planning: boolean;
  planError: string | null;
}) {
  const { terms } = buildTermsFromLiveDashboard(dashboard);
  const shortfall = terms.remaining < -0.005;
  const steps = [
    { icon: Layers3, text: t("startStepCreate").replace("{month}", monthLabel) },
    { icon: SlidersHorizontal, text: t("startStepAdjust").replace("{month}", monthLabel) },
    { icon: Lock, text: t("startStepOpen").replace("{month}", fromLabel) },
  ];
  const body = shortfall
    ? t("startPlanningDeficitBody")
        .replace("{month}", monthLabel)
        .replace(
          "{amount}",
          formatMoneyDisplay(Math.abs(terms.remaining), currency, locale),
        )
        .replace("{from}", fromLabel)
    : t("startPlanningBody")
        .replace("{month}", monthLabel)
        .replace("{from}", fromLabel);

  return (
    <section
      data-testid="next-month-start-planning"
      className={cn(surfaceClass, "px-5 py-5 sm:px-6")}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
        {t("startPlanningKicker")}
      </p>
      <h2 className="mt-1.5 text-xl font-extrabold tracking-tight text-eb-text">
        {t("startPlanningTitle").replace("{month}", monthLabel)}
      </h2>
      <p className="mt-1.5 text-sm leading-6 text-eb-text/65">{body}</p>

      <div className="mt-4 space-y-2.5">
        {steps.map((step) => {
          const StepIcon = step.icon;
          return (
            <div key={step.text} className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-eb-shell/45 text-eb-text/60">
                <StepIcon className="h-4 w-4" />
              </span>
              <p className="pt-1 text-sm leading-5 text-eb-text/70">
                {step.text}
              </p>
            </div>
          );
        })}
      </div>

      {planError ? (
        <div
          data-testid="next-month-start-planning-error"
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-eb-danger/30 bg-eb-danger/10 px-3 py-2.5 text-sm leading-5 text-eb-danger"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{planError}</span>
        </div>
      ) : null}

      <CtaButton
        className="mt-4 h-11 w-full px-5"
        onClick={planError ? onRetryPlanning : onStartPlanning}
        disabled={planning}
      >
        {planning
          ? t("startPlanningPending")
          : planError
            ? t("startPlanningRetry")
            : t("startPlanningAction")}
        {!planning ? <ArrowRight className="ml-1.5 h-4 w-4" /> : null}
      </CtaButton>
      <p className="mt-3 text-center text-xs leading-5 text-eb-text/50">
        {t("startPlanningSafeNote").replace("{month}", monthLabel)}
      </p>
      <ForwardPlanNote t={t} />
    </section>
  );
}

function ForwardPlanNote({ t }: { t: Translate }) {
  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-[14px] border border-eb-stroke/40 bg-eb-shell/25 px-3.5 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-eb-text/50" />
      <div>
        <p className="text-xs font-extrabold text-eb-text/80">
          {t("forwardNoteTitle")}
        </p>
        <p className="mt-1 text-xs leading-5 text-eb-text/60">
          {t("forwardNoteBody")}
        </p>
      </div>
    </div>
  );
}

function ConfirmPlanningModal({
  monthLabel,
  fromLabel,
  t,
  planning,
  onConfirm,
  onClose,
}: {
  monthLabel: string;
  fromLabel: string;
  t: Translate;
  planning: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="next-month-confirm-title"
      className="fixed inset-0 z-[90] flex items-center justify-center p-5"
    >
      <button
        type="button"
        aria-label={t("confirmClose")}
        onClick={planning ? undefined : onClose}
        className="absolute inset-0 cursor-pointer bg-[radial-gradient(circle_at_top,rgb(var(--eb-text)/0.18),rgb(var(--eb-text)/0.50))]"
      />
      <section
        className={cn(
          surfaceClass,
          "relative w-full max-w-[420px] px-6 py-6",
        )}
      >
        <button
          type="button"
          aria-label={t("confirmClose")}
          onClick={planning ? undefined : onClose}
          disabled={planning}
          className="absolute right-4 top-4 rounded-full p-1 text-eb-text/45 transition hover:bg-eb-shell/40 hover:text-eb-text"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-eb-accentSoft text-eb-accent">
          <CalendarClock className="h-6 w-6" />
        </span>
        <h2
          id="next-month-confirm-title"
          className="mt-4 text-xl font-extrabold tracking-tight text-eb-text"
        >
          {t("confirmTitle").replace("{month}", monthLabel)}
        </h2>
        <p className="mt-2 text-sm leading-6 text-eb-text/68">
          {t("confirmBody")
            .replace("{month}", monthLabel)
            .replace("{from}", fromLabel)}
        </p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={planning ? undefined : onClose}
            disabled={planning}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[12px] border border-eb-stroke/45 bg-eb-surface/75 px-4 text-sm font-semibold text-eb-text/75 transition hover:bg-eb-surface"
          >
            {t("confirmCancel")}
          </button>
          <CtaButton
            className="h-11 flex-[1.4] px-4"
            onClick={onConfirm}
            disabled={planning}
          >
            {planning ? (
              <>
                <Clock3 className="mr-1.5 h-4 w-4" />
                {t("confirmPending")}
              </>
            ) : (
              <>
                <Check className="mr-1.5 h-4 w-4" />
                {t("confirmAction")}
              </>
            )}
          </CtaButton>
        </div>
      </section>
    </div>
  );
}

function PlannedEditHub({
  pillars,
  monthOnlyScope,
  t,
}: {
  pillars: Array<{ key: string; label: string; to: string }>;
  monthOnlyScope: string;
  t: Translate;
}) {
  const iconByKey: Record<string, React.ComponentType<{ className?: string }>> =
    {
      income: Wallet,
      expenses: ReceiptText,
      savings: PiggyBank,
      debts: CreditCard,
    };

  return (
    <section
      data-testid="next-month-edit-actions"
      className={cn(surfaceClass, "px-5 py-5 sm:px-6")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-eb-text/50">
            {t("editActionsKicker")}
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-tight text-eb-text">
            {t("editActionsTitle")}
          </h2>
        </div>
        <Pill className="h-8 px-3 text-xs">
          <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
          {monthOnlyScope}
        </Pill>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-eb-text/60">
        {t("editNextMonthOnlyBody")}
      </p>

      <div className="mt-4 space-y-2.5">
        {pillars.map((pillar) => {
          const Icon = iconByKey[pillar.key] ?? Wallet;
          return (
            <Link
              key={pillar.key}
              to={pillar.to}
              data-testid={`next-month-edit-${pillar.key}`}
              className={cn(
                "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[15px]",
                "border border-eb-stroke/40 bg-eb-surface/65 px-3.5 py-3",
                "transition hover:-translate-y-0.5 hover:border-eb-stroke-strong/50 hover:bg-eb-shell/25",
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-eb-shell/45 text-eb-text/65">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-eb-text">
                  {pillar.label}
                </span>
                <span className="block truncate text-xs text-eb-text/50">
                  {t("editRowMeta")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-eb-text/55">
                {t("editRowAction")}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
      <ForwardPlanNote t={t} />
    </section>
  );
}

function LoadingWorkspace() {
  return (
    <div
      data-testid="next-month-preview-skeleton"
      aria-hidden="true"
      className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_330px]"
    >
      <div className="space-y-5">
        <SkeletonSurface tall />
        <SkeletonSurface />
      </div>
      <div className="space-y-5">
        <SkeletonSurface />
        <SkeletonSurface />
      </div>
    </div>
  );
}

function SkeletonSurface({ tall }: { tall?: boolean }) {
  return (
    <div className={cn(surfaceClass, "px-5 py-5 sm:px-6")}>
      <div className="h-3 w-28 animate-pulse rounded bg-eb-stroke/40" />
      <div className="mt-3 h-9 w-56 animate-pulse rounded bg-eb-stroke/40" />
      <div className="mt-4 h-3 w-full max-w-md animate-pulse rounded bg-eb-stroke/30" />
      {tall ? (
        <>
          <div className="mt-7 h-3.5 w-full animate-pulse rounded-full bg-eb-stroke/30" />
          <div className="mt-5 flex flex-wrap gap-3">
            <div className="h-8 w-20 animate-pulse rounded bg-eb-stroke/30" />
            <div className="h-8 w-24 animate-pulse rounded bg-eb-stroke/30" />
            <div className="h-8 w-20 animate-pulse rounded bg-eb-stroke/30" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function PreviewContent({
  dashboard,
  currentDashboard,
  currency,
  previewYearMonth,
  fromYearMonth,
  showCarryAssumption,
  carryAmount,
  locale,
  t,
  onStartPlanning,
  onConfirmPlanning,
  confirmPlanningOpen,
  onCloseConfirm,
  planning,
  planError,
}: {
  dashboard: BudgetDashboardDto;
  currentDashboard: BudgetDashboardDto | null;
  currency: CurrencyCode;
  previewYearMonth: string;
  fromYearMonth: string;
  showCarryAssumption: boolean;
  carryAmount: number;
  locale: string;
  t: Translate;
  onStartPlanning: () => void;
  onConfirmPlanning: () => void;
  confirmPlanningOpen: boolean;
  onCloseConfirm: () => void;
  planning: boolean;
  planError: string | null;
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

  const previewPill = (
    <StatePill icon={Sparkles} label={t("previewNothingSaved")} />
  );

  return (
    <>
      <NextMonthHeader
        monthLabel={previewLabel}
        pill={previewPill}
        body={t("intro")}
        titleTestId="next-month-preview-title"
        t={t}
      />

      <WorkspaceGrid
        main={
          <>
            <MoneyStateSurface
              dashboard={dashboard}
              currency={currency}
              locale={locale}
              t={t}
              testIdBase="next-month-preview"
              mode="preview"
              monthLabel={previewLabel}
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
            <SupportGrid>
              <ComparisonPanel
                currentDashboard={currentDashboard}
                targetDashboard={dashboard}
                currency={currency}
                locale={locale}
                currentYearMonth={fromYearMonth}
                targetYearMonth={previewYearMonth}
                t={t}
              />
              <LifecyclePanel
                stage="preview"
                fromYearMonth={fromYearMonth}
                targetYearMonth={previewYearMonth}
                locale={locale}
                t={t}
              />
            </SupportGrid>
          </>
        }
        aside={
          <StartPlanningPanel
            dashboard={dashboard}
            currency={currency}
            locale={locale}
            monthLabel={previewLabel}
            fromLabel={fromLabel}
            t={t}
            onStartPlanning={onStartPlanning}
            onRetryPlanning={onConfirmPlanning}
            planning={planning}
            planError={planError}
          />
        }
      />

      {confirmPlanningOpen ? (
        <ConfirmPlanningModal
          monthLabel={previewLabel}
          fromLabel={fromLabel}
          t={t}
          planning={planning}
          onConfirm={onConfirmPlanning}
          onClose={onCloseConfirm}
        />
      ) : null}
    </>
  );
}

function PlannedContent({
  dashboard,
  currentDashboard,
  currency,
  fromYearMonth,
  targetYearMonth,
  locale,
  t,
  justPlanned,
}: {
  dashboard: BudgetDashboardDto;
  currentDashboard: BudgetDashboardDto | null;
  currency: CurrencyCode;
  fromYearMonth: string;
  targetYearMonth: string;
  locale: string;
  t: Translate;
  justPlanned: boolean;
}) {
  const successRef = useRef<HTMLElement>(null);

  // After this page creates the planned month, move focus to the success
  // banner so keyboard and screen-reader users land on the confirmation and
  // the edit hub right below it — instead of being left at the page top.
  // Gated on `justPlanned`: a direct visit to an already-planned month must
  // never steal focus. Reduced-motion users get an instant jump, not a scroll.
  useEffect(() => {
    if (!justPlanned) return;
    const node = successRef.current;
    if (!node) return;

    node.focus({ preventScroll: true });

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    node.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [justPlanned]);

  const plannedLabel = ymLabel(targetYearMonth, locale);
  const plannedLabelCap =
    plannedLabel.charAt(0).toUpperCase() + plannedLabel.slice(1);
  const successTitle = t("plannedSuccessTitle").replace(
    "{month}",
    plannedLabelCap,
  );
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

  const plannedPill = (
    <StatePill icon={CheckCircle2} label={t("plannedBadge")} tone="accent" />
  );

  return (
    <>
      <NextMonthHeader
        monthLabel={plannedLabel}
        pill={plannedPill}
        body={t("plannedIntro")}
        titleTestId="next-month-planned-title"
        t={t}
      />

      {/*
        Quiet success moment, only right after this page created the planned
        month (the mutation resolved this session). Revisiting an already-planned
        month remounts with no success flag, so the ribbon stays out of the way.
      */}
      {justPlanned ? (
        <section
          ref={successRef}
          tabIndex={-1}
          data-testid="next-month-planned-success"
          role="status"
          aria-labelledby="next-month-planned-success-title"
          className={cn(
            "flex items-start gap-3 rounded-3xl shadow-eb",
            "border border-eb-accent/40 bg-eb-accentSoft/60",
            "px-5 py-4 sm:px-7",
            "scroll-mt-6 outline-none",
            "focus-visible:ring-2 focus-visible:ring-eb-accent/55 focus-visible:ring-offset-2 focus-visible:ring-offset-eb-surface",
          )}
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-eb-accent" />
          <div>
            <p
              id="next-month-planned-success-title"
              className="text-sm font-extrabold tracking-tight text-eb-text"
            >
              {successTitle}
            </p>
            <p className="mt-0.5 text-sm leading-6 text-eb-text/70">
              {t("plannedSuccessBody")}
            </p>
          </div>
        </section>
      ) : null}

      <WorkspaceGrid
        main={
          <>
            <MoneyStateSurface
              dashboard={dashboard}
              currency={currency}
              locale={locale}
              t={t}
              testIdBase="next-month-planned"
              mode="planned"
              monthLabel={plannedLabel}
            />
            <PlannedEditHub
              pillars={pillars}
              monthOnlyScope={monthOnlyScope}
              t={t}
            />
          </>
        }
        aside={
          <>
            <ComparisonPanel
              currentDashboard={currentDashboard}
              targetDashboard={dashboard}
              currency={currency}
              locale={locale}
              currentYearMonth={fromYearMonth}
              targetYearMonth={targetYearMonth}
              t={t}
            />
            <LifecyclePanel
              stage="planned"
              fromYearMonth={fromYearMonth}
              targetYearMonth={targetYearMonth}
              locale={locale}
              t={t}
            />
          </>
        }
      />
    </>
  );
}

export default NextMonthPreviewPage;
