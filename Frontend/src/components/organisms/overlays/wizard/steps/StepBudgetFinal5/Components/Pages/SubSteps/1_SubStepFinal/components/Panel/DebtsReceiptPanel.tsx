import React, { useMemo } from "react";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import { ReceiptFooter } from "../receipt/ReceiptFooter";

type Strategy = "avalanche" | "snowball" | "noAction" | "unknown";

function strategyLabel(s: Strategy) {
    switch (s) {
        case "avalanche":
            return "Lavinen (hög ränta först)";
        case "snowball":
            return "Snöbollen (minsta skuld först)";
        case "noAction":
            return "Ingen preferens";
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
                left: "Minimibetalningar",
                right: money0(total),
                rightSub: "/mån",
            },
            {
                left: "Strategi",
                right: strategyLabel(strategy),
            },
            ...top.map((d: any) => {
                const name = d.name ?? "Skuld";
                const bal = d.balance ?? 0;
                const apr = d.apr != null ? `${Number(d.apr).toFixed(1)}%` : "—";
                const pay = d.monthlyPayment != null ? money0(d.monthlyPayment) : "—";

                return {
                    left: name,
                    right: pay,
                    rightSub: d.monthlyPayment != null ? "/mån" : undefined,
                    sub: `${money0(bal)} • ${apr}`,
                };
            }),
        ];

        if (missing > 0) {
            rows.push({
                left: "Saknad uppgift",
                right: `${missing} skuld${missing > 1 ? "er" : ""}`,
                sub: "Vissa fält saknas (ränta/betalning/saldo).",
            });
        }

        return { rows, count, total };
    }, [preview, money0]);

    return (
        <div className="space-y-3">
            <ReceiptList
                title="Skulder"
                unit="" // ✅ because list contains mixed units (strategy isn’t /mån)
                rows={vm.rows}
                footer={
                    <ReceiptFooter
                        leftSummary={`${vm.count} skulder`}
                        rightSummary={
                            <>
                                {money0(vm.total)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">/mån</span>
                            </>
                        }
                        hint="Minimibetalningar är en uppskattning. Du kan justera senare."
                        editLabel="Ändra skulder"
                        onEdit={onEdit}
                    />
                }
            />
        </div>
    );
}
