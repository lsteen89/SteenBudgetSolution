import React, { useMemo } from "react";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { ReceiptFooter } from "../receipt/ReceiptFooter";

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
    const vm = useMemo(() => {
        const habit = preview.savings?.monthlySavings ?? 0;
        const goals = preview.savings?.goals ?? [];
        const goalMonthly = goals.reduce((a: number, g: any) => a + (g.monthlyContribution ?? 0), 0);
        const total = habit + goalMonthly;

        const topGoals = goals.slice(0, 3);

        const habitRows: ReceiptRow[] = [
            { left: "Sparande (vanor)", right: money0(habit) },
        ];

        const goalRows: ReceiptRow[] = topGoals.map((g: any) => {
            const date = g.targetDate ? String(g.targetDate).slice(0, 7) : "—";
            return {
                left: g.name ?? "Mål",
                right: money0(g.monthlyContribution ?? 0),
                sub: date,
            };
        });

        return { habit, goals, goalMonthly, total, habitRows, goalRows };
    }, [preview, money0]);

    return (
        <div className="space-y-4">
            <ReceiptList
                title="Vanor"
                unit="/mån"
                rows={vm.habitRows}
                footer={
                    <ReceiptFooter
                        leftSummary="Sparvana"
                        rightSummary={
                            <>
                                {money0(vm.habit)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">/mån</span>
                            </>
                        }
                        hint="Du kan alltid justera sparvanan senare."
                        editLabel="Ändra sparande"
                        onEdit={onEditHabit}
                    />
                }
            />

            <ReceiptList
                title="Mål"
                unit="/mån"
                rows={vm.goalRows.length ? vm.goalRows : [{ left: "Inga mål", right: "—" }]}
                footer={
                    <ReceiptFooter
                        leftSummary={`${vm.goals.length} mål`}
                        rightSummary={
                            <>
                                {money0(vm.goalMonthly)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">/mån</span>
                            </>
                        }
                        extraRight={vm.goals.length > 3 ? `Visa alla mål (${vm.goals.length})` : null}
                        hint="Du kan alltid justera målen senare."
                        editLabel="Ändra mål"
                        onEdit={onEditGoals}
                    />
                }
            />
        </div>
    );
}
