import React, { useMemo } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { getEffectiveGoalMonthlyContribution } from "@/utils/budget/financialCalculations";
import { tDict } from "@/utils/i18n/translate";
import { ReceiptFooter } from "../receipt/ReceiptFooter";
import { finalReceiptPanelsDict } from "./FinalReceiptPanels.i18n";

export default function SavingsReceiptPanel({
    preview,
    money0,
    onEditHabit,
    onEditGoals,
}: {
    preview: BudgetDashboardDto;
    money0: (n: number) => string;
    onEditHabit?: () => void;
    onEditGoals?: () => void;
}) {
    const locale = useAppLocale();
    const t = <K extends keyof typeof finalReceiptPanelsDict.sv>(k: K) =>
        tDict(k, locale, finalReceiptPanelsDict);

    const goalsCountLabel = (count: number) =>
        t(count === 1 ? "savingsGoalsOne" : "savingsGoalsOther").replace(
            "{count}",
            String(count),
        );

    const vm = useMemo(() => {
        const habit = preview.savings?.monthlySavings ?? 0;
        const goals = preview.savings?.goals ?? [];
        const goalMonthly = goals.reduce(
            (a: number, g: any) =>
                a +
                getEffectiveGoalMonthlyContribution({
                    monthlyContribution: g.monthlyContribution,
                    targetAmount: g.targetAmount,
                    amountSaved: g.amountSaved,
                    targetDate: g.targetDate,
                }),
            0,
        );
        const total = habit + goalMonthly;

        const topGoals = goals.slice(0, 3);

        const habitRows: ReceiptRow[] = [
            { left: t("savingsHabitLabel"), right: money0(habit) },
        ];

        const goalRows: ReceiptRow[] = topGoals.map((g: any) => {
            const date = g.targetDate ? String(g.targetDate).slice(0, 7) : "—";
            return {
                left: g.name ?? t("savingsGoalFallback"),
                right: money0(
                    getEffectiveGoalMonthlyContribution({
                        monthlyContribution: g.monthlyContribution,
                        targetAmount: g.targetAmount,
                        amountSaved: g.amountSaved,
                        targetDate: g.targetDate,
                    }),
                ),
                sub: date,
            };
        });

        return { habit, goals, goalMonthly, total, habitRows, goalRows };
    }, [preview, money0, t]);

    return (
        <div className="space-y-4">
            <ReceiptList
                title={t("savingsHabitsTitle")}
                unit={t("perMonthSuffix")}
                rows={vm.habitRows}
                footer={
                    <ReceiptFooter
                        leftSummary={t("savingsHabitSummary")}
                        rightSummary={
                            <>
                                {money0(vm.habit)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">{t("perMonthSuffix")}</span>
                            </>
                        }
                        hint={t("savingsHintHabit")}
                        editLabel={t("savingsEditHabit")}
                        onEdit={onEditHabit}
                    />
                }
            />

            <ReceiptList
                title={t("savingsGoalsTitle")}
                unit={t("perMonthSuffix")}
                rows={vm.goalRows.length ? vm.goalRows : [{ left: t("savingsNoGoals"), right: "—" }]}
                footer={
                    <ReceiptFooter
                        leftSummary={goalsCountLabel(vm.goals.length)}
                        rightSummary={
                            <>
                                {money0(vm.goalMonthly)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">{t("perMonthSuffix")}</span>
                            </>
                        }
                        extraRight={vm.goals.length > 3 ? t("savingsShowAllGoals").replace("{count}", String(vm.goals.length)) : null}
                        hint={t("savingsHintGoals")}
                        editLabel={t("savingsEditGoals")}
                        onEdit={onEditGoals}
                    />
                }
            />
        </div>
    );
}
