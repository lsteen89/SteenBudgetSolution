import React, { useMemo } from "react";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { asCategoryKey, labelCategory } from "@/utils/i18n/categories";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { ReceiptFooter } from "../receipt/ReceiptFooter";

export default function ExpensesReceiptPanel({
    preview,
    money0,
    onEdit,
}: {
    preview: BudgetDashboardDto;
    money0: (n: number) => string;
    onEdit?: () => void;
}) {
    const locale = useAppLocale();

    const { rows, total, count } = useMemo(() => {
        const cats = preview.expenditure?.byCategory ?? [];
        const total =
            preview.expenditure?.totalExpensesMonthly ??
            cats.reduce((a: number, c: any) => a + (c.totalMonthlyAmount ?? 0), 0);

        const sorted = [...cats].sort(
            (a: any, b: any) => (b.totalMonthlyAmount ?? 0) - (a.totalMonthlyAmount ?? 0)
        );
        const top = sorted.slice(0, 6);

        const sumTop = top.reduce((a: number, c: any) => a + (c.totalMonthlyAmount ?? 0), 0);
        const other = Math.max(0, (total ?? 0) - sumTop);

        const rows: ReceiptRow[] = top.map((c: any) => {
            const amount = c.totalMonthlyAmount ?? 0;
            const pct = total > 0 ? Math.round((amount / total) * 100) : 0;

            // ✅ always translate via key
            const key = asCategoryKey(c.categoryKey ?? c.categoryName);
            const label = labelCategory(key, locale);

            return {
                left: label,
                right: money0(amount),
                sub: `${pct}%`,
            };
        });

        if (sorted.length > 6) {
            rows.push({
                left: labelCategory("other", locale),
                right: money0(other),
                sub: `${sorted.length - 6} kategorier`,
            });
        }

        return { rows, total, count: sorted.length };
    }, [preview, money0, locale]);

    return (
        <div className="space-y-3">
            <ReceiptList
                title="Toppkategorier"
                rows={rows}
                footer={
                    <ReceiptFooter
                        leftSummary={`${count} kategorier`}
                        rightSummary={
                            <>
                                {money0(total)} <span className="text-xs font-semibold text-wizard-text/55">/mån</span>
                            </>
                        }
                        hint="Stämmer det här ungefär? Du kan justera efteråt."
                        editLabel="Ändra utgifter"
                        onEdit={onEdit}
                    />

                }
            />
        </div>
    );
}
