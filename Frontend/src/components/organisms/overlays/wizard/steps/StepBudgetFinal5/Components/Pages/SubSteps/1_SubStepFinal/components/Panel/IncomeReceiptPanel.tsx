import React, { useMemo } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { tDict } from "@/utils/i18n/translate";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import { ReceiptFooter } from "../receipt/ReceiptFooter";
import { finalReceiptPanelsDict } from "./FinalReceiptPanels.i18n";

type Props = {
    preview: BudgetDashboardDto;
    money0: (n: number) => string;
    onEdit?: () => void;
};

export default function IncomeReceiptPanel({ preview, money0, onEdit }: Props) {
    const locale = useAppLocale();
    const salary = preview.income?.netSalaryMonthly ?? 0;
    const t = <K extends keyof typeof finalReceiptPanelsDict.sv>(k: K) =>
        tDict(k, locale, finalReceiptPanelsDict);

    const rowCountLabel = (count: number) =>
        t(count === 1 ? "incomeRowsOne" : "incomeRowsOther").replace(
            "{count}",
            String(count),
        );

    const rows = useMemo(() => {
        const r: { left: string; right: string; sub?: string }[] = [];

        if (salary > 0) {
            r.push({ left: t("incomeSalaryNet"), right: money0(salary) });
        }

        for (const s of preview.income?.sideHustles ?? []) {
            const v = Number(s.amountMonthly ?? 0);
            if (!v) continue;
            r.push({ left: s.name ?? t("incomeSideIncomeFallback"), right: money0(v) });
        }

        for (const m of preview.income?.householdMembers ?? []) {
            const v = Number(m.amountMonthly ?? 0);
            if (!v) continue;
            r.push({ left: m.name ?? t("incomeHouseholdMemberFallback"), right: money0(v) });
        }

        return r;
    }, [preview, salary, money0, t]);

    const total = preview.income?.totalIncomeMonthly ?? rows.reduce((a, x) => a + 0, 0);
    const count = rows.length;

    return (
        <div className="space-y-3">
            <ReceiptList
                title={t("incomeTitle")}
                unit={t("perMonthSuffix")}
                rows={rows}
                footer={
                    <ReceiptFooter
                        leftSummary={rowCountLabel(count)}
                        rightSummary={
                            <>
                                {money0(total)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">{t("perMonthSuffix")}</span>
                            </>
                        }
                        hint={t("incomeHint")}
                        editLabel={t("incomeEdit")}
                        onEdit={onEdit}
                    />
                }
            />
        </div>
    );
}
