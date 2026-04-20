import React, { useMemo } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { tDict } from "@/utils/i18n/translate";
import { ReceiptFooter } from "../receipt/ReceiptFooter";
import { finalReceiptPanelsDict } from "./FinalReceiptPanels.i18n";

type Strategy = "avalanche" | "snowball" | "noAction" | "unknown";

function strategyLabel(
    s: Strategy,
    t: <K extends keyof typeof finalReceiptPanelsDict.sv>(k: K) => string,
) {
    switch (s) {
        case "avalanche":
            return t("strategyAvalanche");
        case "snowball":
            return t("strategySnowball");
        case "noAction":
            return t("strategyNoAction");
        default:
            return "—";
    }
}

function readStrategy(dto: BudgetDashboardDto): Strategy {
    const anyDto: any = dto;
    return (
        anyDto?.debt?.repaymentStrategy ??
        anyDto?.debt?.strategy ??
        anyDto?.wizard?.summary?.repaymentStrategy ??
        "unknown"
    );
}

export default function DebtsReceiptPanel({
    preview,
    money0,
    onEdit,
}: {
    preview: BudgetDashboardDto;
    money0: (n: number) => string;
    onEdit?: () => void;
}) {
    const locale = useAppLocale();
    const t = <K extends keyof typeof finalReceiptPanelsDict.sv>(k: K) =>
        tDict(k, locale, finalReceiptPanelsDict);

    const debtCountLabel = (count: number) =>
        t(count === 1 ? "debtsCountOne" : "debtsCountOther").replace(
            "{count}",
            String(count),
        );

    const missingDebtCountLabel = (count: number) =>
        t(
            count === 1 ? "missingDebtCountOne" : "missingDebtCountOther",
        ).replace("{count}", String(count));

    const vm = useMemo(() => {
        const debts = preview.debt?.debts ?? [];
        const count = debts.length;

        const totalFromDto = preview.debt?.totalMonthlyPayments ?? 0;
        const totalFromItems = debts.reduce((a: number, d: any) => a + (d.monthlyPayment ?? 0), 0);
        const total = totalFromDto > 0 ? totalFromDto : totalFromItems;

        const strategy = readStrategy(preview);

        const sorted = [...debts].sort((a: any, b: any) => {
            const aprDiff = (b.apr ?? 0) - (a.apr ?? 0);
            if (aprDiff !== 0) return aprDiff;
            return (b.balance ?? 0) - (a.balance ?? 0);
        });

        const top = sorted.slice(0, 4);

        const missing = debts.filter(
            (d: any) => d.apr == null || d.monthlyPayment == null || d.balance == null
        ).length;

        const rows: ReceiptRow[] = [
            {
                left: t("debtsMinimumPayments"),
                right: money0(total),
                rightSub: t("perMonthSuffix"),
            },
            {
                left: t("debtsStrategy"),
                right: strategyLabel(strategy, t),
            },
            ...top.map((d: any) => {
                const name = d.name ?? t("debtsDebtFallback");
                const bal = d.balance ?? 0;
                const apr = d.apr != null ? `${Number(d.apr).toFixed(1)}%` : "—";
                const pay = d.monthlyPayment != null ? money0(d.monthlyPayment) : "—";

                return {
                    left: name,
                    right: pay,
                    rightSub: d.monthlyPayment != null ? t("perMonthSuffix") : undefined,
                    sub: `${money0(bal)} • ${apr}`,
                };
            }),
        ];

        if (missing > 0) {
            rows.push({
                left: t("debtsMissingDataLabel"),
                right: missingDebtCountLabel(missing),
                sub: t("debtsMissingDataDetail"),
            });
        }

        return { rows, count, total };
    }, [preview, money0, missingDebtCountLabel, t]);

    return (
        <div className="space-y-3">
            <ReceiptList
                title={t("debtsTitle")}
                unit=""
                rows={vm.rows}
                footer={
                    <ReceiptFooter
                        leftSummary={debtCountLabel(vm.count)}
                        rightSummary={
                            <>
                                {money0(vm.total)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">{t("perMonthSuffix")}</span>
                            </>
                        }
                        hint={t("debtsHint")}
                        editLabel={t("debtsEdit")}
                        onEdit={onEdit}
                    />
                }
            />
        </div>
    );
}
