import React from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { goalsCardDict } from "@/utils/i18n/pages/private/dashboard/cards/GoalsCard.i18n";
import { tDict } from "@/utils/i18n/translate";

type Props = {
    description: string;
    goalsProgressPercent: number;
};

const GoalsCard: React.FC<Props> = ({ description, goalsProgressPercent }) => {
    const locale = useAppLocale();
    const t = <K extends keyof typeof goalsCardDict.sv>(key: K) =>
        tDict(key, locale, goalsCardDict);

    return (
        <div className="rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-2">{t("title")}</h2>
            <p className="text-xs text-slate-500 mb-3">{description}</p>

            <div className="space-y-2 text-xs text-slate-700">
                <div>
                    <div className="flex justify-between mb-0.5">
                        <span>{t("emergencyFund")}</span>
                        <span>{goalsProgressPercent.toFixed(0)} %</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-emerald-400" style={{ width: `${goalsProgressPercent}%` }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoalsCard;
