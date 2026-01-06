import React from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/hooks/dashboard/useDashboardSummary";
import BreakdownHeader from "@/components/organisms/dashboard/breakdown/BreakdownHeader";
import IncomeBreakdownCard from "@/components/organisms/dashboard/breakdown/IncomeBreakdownCard";
import ExpensesBreakdownCard from "@/components/organisms/dashboard/breakdown/ExpensesBreakdownCard";
import SubscriptionsBreakdownCard from "@/components/organisms/dashboard/breakdown/SubscriptionsBreakdownCard";
import SavingsDebtsCard from "@/components/organisms/dashboard/breakdown/SavingsDebtsCard";
import DashboardErrorState from "@/components/organisms/dashboard/DashboardErrorState";
import BreakdownPageSkeleton from "@/components/organisms/dashboard/breakdown/BreakdownPageSkeleton";
import PageContainer from "@components/layout/PageContainer";
import ContentWrapper from "@components/layout/ContentWrapper";
import { Link } from "react-router-dom";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import BreakdownInsightsCard from "@/components/organisms/dashboard/breakdown/BreakdownInsightsCard";
import { incomeToBreakdownItems } from "@/hooks/dashboard/dashboardBreakdown.mapper";

const DashboardBreakdownPage: React.FC = () => {
    const { data, status, error, refetch } = useDashboardSummary();

    if (status === "idle" || status === "loading") {
        return <BreakdownPageSkeleton data-testid="breakdown-skeleton" />;
    }

    if (status === "error") {
        return (
            <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
                <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
                    <div className="w-full max-w-6xl space-y-4 px-4 py-6">
                        <DashboardErrorState
                            title="Kunde inte ladda din översikt"
                            message={error?.message ?? "Försök igen om en stund."}
                            onRetry={refetch}
                        />
                        <Link
                            to="/dashboard"
                            className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-white/70 border border-slate-200 text-slate-800 hover:bg-slate-50 transition"
                        >
                            Tillbaka
                        </Link>
                    </div>
                </ContentWrapper>
            </PageContainer>
        );
    }

    if (status === "notfound" || !data) {
        return (
            <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
                <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
                    <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm p-5">
                        <p className="text-sm text-slate-600">Det finns ingen budget ännu, så det finns inget att bryta ner.</p>
                        <Link
                            to="/dashboard"
                            className="mt-4 inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium bg-slate-900 text-white hover:bg-slate-800 transition"
                        >
                            Tillbaka
                        </Link>
                    </div>
                </ContentWrapper>
            </PageContainer>
        );
    }

    const { summary, breakdown } = data;
    const toneClass = summary.finalBalance >= 0 ? "text-emerald-600" : "text-rose-600";
    const currency = summary.remainingCurrency;

    return (
        <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
            <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
                <BreakdownHeader
                    title="Varför är “Kvar att spendera” så här?"
                    equation={
                        <>
                            Inkomster − Utgifter − Sparande − Skuldbetalningar ={" "}
                            <span className={`font-semibold ${toneClass}`}>
                                {formatMoneyV2(summary.finalBalance, summary.remainingCurrency)}
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
                            currency={summary.remainingCurrency}
                            totalExpenditure={summary.totalExpenditure}
                            categoryItems={breakdown.expenseCategoryItems}
                            recurringExpenses={summary.recurringExpenses}
                        />
                        <SavingsDebtsCard
                            currency={summary.remainingCurrency}
                            totalSavings={summary.totalSavings}
                            totalDebtPayments={summary.totalDebtPayments}
                            finalBalance={summary.finalBalance}
                            savingsItems={breakdown.savingsItems}
                            debtItems={breakdown.debtItems}
                        />
                    </div>

                    <div className="space-y-4">
                        <BreakdownInsightsCard
                            currency={summary.remainingCurrency}
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
                            currency={summary.remainingCurrency}
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

