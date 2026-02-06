import React, { useMemo } from "react";
import type { BudgetDashboardDto } from "@/types/budget/BudgetDashboardDto";
import ReceiptList, { type ReceiptRow } from "../receipt/ReceiptList";
import { ReceiptFooter } from "../receipt/ReceiptFooter";

type Props = {
    preview: BudgetDashboardDto;
    money0: (n: number) => string;
    onEdit?: () => void;
};

export default function IncomeReceiptPanel({ preview, money0, onEdit }: Props) {
    const salary = preview.income?.netSalaryMonthly ?? 0;

    const rows = useMemo(() => {
        const r: { left: string; right: string; sub?: string }[] = [];

        if (salary > 0) {
            r.push({ left: "Lön (netto)", right: money0(salary) });
        }

        for (const s of preview.income?.sideHustles ?? []) {
            const v = Number(s.amountMonthly ?? 0);
            if (!v) continue;
            r.push({ left: s.name ?? "Sidoinkomst", right: money0(v) });
        }

        for (const m of preview.income?.householdMembers ?? []) {
            const v = Number(m.amountMonthly ?? 0);
            if (!v) continue;
            r.push({ left: m.name ?? "Hushållsmedlem", right: money0(v) });
        }

        return r;
    }, [preview, salary, money0]);

    const total = preview.income?.totalIncomeMonthly ?? rows.reduce((a, x) => a + 0, 0);
    const count = rows.length;

    return (
        <div className="space-y-3">
            <ReceiptList
                title="Inkomster"
                unit="/mån"
                rows={rows}
                footer={
                    <ReceiptFooter
                        leftSummary={`${count} rader`}
                        rightSummary={
                            <>
                                {money0(total)}{" "}
                                <span className="text-xs font-semibold text-wizard-text/55">/mån</span>
                            </>
                        }
                        hint="Ser det här rimligt ut? Du kan alltid justera efteråt."
                        editLabel="Ändra inkomster"
                        onEdit={onEdit}
                    />
                }
            />
        </div>
    );
}
