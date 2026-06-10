import React from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

import AllocationBar, {
  ALLOCATION_SEGMENT_BAR_CLASS,
  getVisibleAllocationSegments,
  type AllocationBarLabels,
  type AllocationSegmentKey,
} from "@/components/molecules/budget/AllocationBar";
import { Pill } from "@/components/atoms/badges/Pill";
import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import ContentWrapper from "@components/layout/ContentWrapper";
import PageContainer from "@components/layout/PageContainer";
import { buildTermsFromLiveDashboard } from "@/domain/budget/dashboardTerms";
import {
  classifyRemaining,
  isEmptyPlanDashboard,
  ymLabel,
} from "@/domain/budget/nextMonthPreview";
import { useBudgetMonthsStatusQuery } from "@/hooks/budget/useBudgetMonthsStatusQuery";
import { useNextMonthPreviewQuery } from "@/hooks/budget/useNextMonthPreviewQuery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { useAuthStore } from "@/stores/Auth/authStore";
import type { NextMonthPreviewDto } from "@/types/budget/NextMonthPreviewDto";
import { toApiProblem } from "@/api/toApiProblem";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { dashboardErrorStateDict } from "@/utils/i18n/pages/private/dashboard/DashboardErrorState.i18n";
import { nextMonthPreviewDict } from "@/utils/i18n/pages/private/dashboard/pages/NextMonthPreviewPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import type { CurrencyCode } from "@/utils/money/currency";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

const NextMonthPreviewPage: React.FC = () => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof nextMonthPreviewDict.sv>(k: K): string =>
    tDict(k, locale, nextMonthPreviewDict);
  const tError = <K extends keyof typeof dashboardErrorStateDict.sv>(
    k: K,
  ): string => tDict(k, locale, dashboardErrorStateDict);

  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const monthsQ = useBudgetMonthsStatusQuery({ enabled: !firstLogin });
  const openMonth = monthsQ.data?.openMonthYearMonth ?? null;

  const previewQ = useNextMonthPreviewQuery(openMonth, {
    enabled: !firstLogin && !!openMonth,
  });

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

  if (firstLogin) {
    return unavailable();
  }

  // Months status must resolve before we know the from-month.
  if (monthsQ.isPending) {
    return shell(<PreviewSkeleton />);
  }
  if (monthsQ.isError) {
    return shell(
      <DashboardErrorState
        title={t("errorTitle")}
        message={
          monthsQ.error
            ? toUserMessage(toApiProblem(monthsQ.error), locale)
            : t("errorFallback")
        }
        onRetry={monthsQ.refetch}
        retryLabel={tError("retry")}
        reloadLabel={tError("reload")}
      />,
    );
  }

  // No open month to project from — honest unavailable state, never a fake number.
  if (!openMonth) {
    return unavailable();
  }

  if (previewQ.isPending) {
    return shell(<PreviewSkeleton />);
  }
  if (previewQ.isError) {
    return shell(
      <DashboardErrorState
        title={t("errorTitle")}
        message={
          previewQ.error
            ? toUserMessage(toApiProblem(previewQ.error), locale)
            : t("errorFallback")
        }
        onRetry={previewQ.refetch}
        retryLabel={tError("retry")}
        reloadLabel={tError("reload")}
      />,
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

  return shell(<PreviewContent preview={preview} locale={locale} t={t} />);
};

function PreviewContent({
  preview,
  locale,
  t,
}: {
  preview: NextMonthPreviewDto;
  locale: string;
  t: <K extends keyof typeof nextMonthPreviewDict.sv>(k: K) => string;
}) {
  const currency = preview.currencyCode as CurrencyCode;
  // dashboard is guaranteed non-null for state === "preview" (checked by caller).
  const { terms } = buildTermsFromLiveDashboard(preview.dashboard!);

  const tone = classifyRemaining(terms.remaining);
  const previewLabel = ymLabel(preview.previewYearMonth, locale);
  const fromLabel = ymLabel(preview.fromYearMonth, locale);

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

  const showCarryAssumption = preview.carryOver.mode === "estimatedFull";
  const carryCopy = t("carryAssumption")
    .replace("{month}", fromLabel)
    .replace("{amount}", fmt(preview.carryOver.amount));

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

      <section
        data-testid="next-month-preview"
        data-tone={tone}
        aria-labelledby="next-month-preview-remaining-label"
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
          id="next-month-preview-remaining-label"
          className="text-xs font-semibold uppercase tracking-wide text-eb-text/55"
        >
          {t("remainingLabel")}
        </p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <p
            data-testid="next-month-preview-remaining"
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

        {/*
          Same six-term equation grammar as the live dashboard's MoneyState,
          fed by the shared `buildTermsFromLiveDashboard`. Remaining is the
          backend-authoritative projection — nothing is computed for display.
        */}
        <div
          data-testid="next-month-preview-equation"
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
                <li
                  key={segment.key}
                  className="inline-flex items-center gap-1.5"
                >
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
              testId="next-month-preview-allocation"
            />
          </div>
        </div>

        <div className="mt-6 space-y-1.5 border-t border-eb-stroke/40 pt-4 text-xs leading-5 text-eb-text/55">
          <p>{t("basisNote")}</p>
          {showCarryAssumption ? (
            <p data-testid="next-month-preview-carry-assumption">{carryCopy}</p>
          ) : null}
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
