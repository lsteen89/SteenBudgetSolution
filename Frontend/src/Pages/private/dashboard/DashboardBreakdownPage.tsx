import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import BreakdownHeader from "@/components/organisms/dashboard/breakdown/BreakdownHeader";
import BreakdownInsightsCard from "@/components/organisms/dashboard/breakdown/BreakdownInsightsCard";
import BreakdownPageSkeleton from "@/components/organisms/dashboard/breakdown/BreakdownPageSkeleton";
import ExpensesBreakdownCard from "@/components/organisms/dashboard/breakdown/ExpensesBreakdownCard";
import IncomeBreakdownCard from "@/components/organisms/dashboard/breakdown/IncomeBreakdownCard";
import SavingsDebtsCard from "@/components/organisms/dashboard/breakdown/SavingsDebtsCard";
import SubscriptionsBreakdownCard from "@/components/organisms/dashboard/breakdown/SubscriptionsBreakdownCard";
import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { useAuthStore } from "@/stores/Auth/authStore";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { breakdownDict } from "@/utils/i18n/pages/private/dashboard/pages/BreakdownPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import ContentWrapper from "@components/layout/ContentWrapper";
import PageContainer from "@components/layout/PageContainer";
import React from "react";
import { Link } from "react-router-dom";

const DashboardBreakdownPage: React.FC = () => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof breakdownDict.sv>(k: K) =>
    tDict(k, locale, breakdownDict);

  const firstLogin = useAuthStore((s) => s.user?.firstLogin);

  const { data, isPending, isError, error, refetch } = useDashboardSummary({
    enabled: !firstLogin,
  });

  if (firstLogin) {
    return (
      <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
        <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
          <div className="w-full max-w-3xl px-4">
            <SurfaceCard className="p-6 sm:p-8">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-eb-text">
                {t("firstLoginTitle")}
              </h1>
              <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
                {t("firstLoginBody")}
              </p>

              <div className="mt-6">
                <Link
                  to={`${appRoutes.dashboard}?wizard=1`}
                  className="inline-flex items-center justify-center rounded-2xl px-5 h-11 font-semibold bg-eb-accent text-white"
                >
                  {t("firstLoginCta")}
                </Link>
              </div>
            </SurfaceCard>
          </div>
        </ContentWrapper>
      </PageContainer>
    );
  }
  if (isPending) {
    return <BreakdownPageSkeleton data-testid="breakdown-skeleton" />;
  }
  if (isError) {
    return (
      <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
        <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
          <div className="w-full max-w-6xl space-y-4 px-4 py-6">
            <DashboardErrorState
              title={t("errorTitle")}
              message={
                error ? toUserMessage(error, locale) : t("errorFallback")
              }
              onRetry={refetch}
            />
            <Link
              to="/dashboard"
              className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-white/70 border border-slate-200 text-slate-800 hover:bg-slate-50 transition"
            >
              {t("back")}
            </Link>
          </div>
        </ContentWrapper>
      </PageContainer>
    );
  }

  if (!data) {
    return (
      <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
        <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
          <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm p-5">
            <p className="text-sm text-slate-600">{t("emptyBody")}</p>
            <Link
              to="/dashboard"
              className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
            >
              {t("back")}
            </Link>
          </div>
        </ContentWrapper>
      </PageContainer>
    );
  }

  const { summary, breakdown } = data;
  const toneClass =
    summary.finalBalance >= 0 ? "text-emerald-600" : "text-rose-600";
  const currency = summary.currency;

  return (
    <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
      <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
        <BreakdownHeader
          title={t("headerTitle")}
          equation={
            <>
              {t("eqIncome")} − {t("eqExpenses")} − {t("eqSavings")} −{" "}
              {t("eqDebt")} ={" "}
              <span className={`font-semibold ${toneClass}`}>
                {formatMoneyV2(summary.finalBalance, summary.currency)}
              </span>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <IncomeBreakdownCard
              totalIncome={summary.totalIncome}
              currency={currency}
              items={breakdown.incomeItems}
            />
            <ExpensesBreakdownCard
              currency={summary.currency}
              totalExpenditure={summary.totalExpenditure}
              categoryItems={breakdown.expenseCategoryItems}
              recurringExpenses={summary.recurringExpenses}
            />
            <SavingsDebtsCard
              currency={summary.currency}
              totalSavings={summary.totalSavings}
              totalDebtPayments={summary.totalDebtPayments}
              finalBalance={summary.finalBalance}
              savingsItems={breakdown.savingsItems}
              debtItems={breakdown.debtItems}
            />
          </div>

          <div className="space-y-4">
            <BreakdownInsightsCard
              currency={summary.currency}
              totalIncome={summary.totalIncome}
              totalExpenditure={summary.totalExpenditure}
              totalSavings={summary.totalSavings}
              totalDebtPayments={summary.totalDebtPayments}
              finalBalance={summary.finalBalance}
              expenseCategories={breakdown.expenseCategoryItems}
              recurringExpenses={summary.recurringExpenses}
              subscriptions={summary.subscriptions}
              subscriptionsTotal={summary.subscriptionsTotal}
            />
            <SubscriptionsBreakdownCard
              currency={summary.currency}
              subscriptionsTotal={summary.subscriptionsTotal}
              subscriptionsCount={summary.subscriptionsCount}
              subscriptions={summary.subscriptions}
            />
          </div>
        </div>
      </ContentWrapper>
    </PageContainer>
  );
};

export default DashboardBreakdownPage;
