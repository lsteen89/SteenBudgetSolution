import React from "react";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import WizardStatTile from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTile";
import WizardStatTileWithCta from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTileWithCta";
import WizardBadge from "@/components/organisms/overlays/wizard/SharedComponents/Badge/WizardBadge";

type Status = "missing" | "noGoals" | "fits" | "deficit";

type Props = {
    monthlySavings: number | null;
    requiredTotal: number;
    goalsCount: number;
    onGoToHabits?: () => void; // used for missing/deficit

};

export default function SavingsPlanSummaryCard({
    monthlySavings,
    requiredTotal,
    goalsCount,
    onGoToHabits,
}: Props) {
    const currency = useAppCurrency();
    const locale = useAppLocale();

    const money0 = React.useCallback(
        (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
        [currency, locale]
    );

    const savings =
        typeof monthlySavings === "number" && Number.isFinite(monthlySavings) ? monthlySavings : 0;

    const required = Number.isFinite(requiredTotal) ? requiredTotal : 0;

    const hasSavingsAnswer = savings > 0; // your rule: 0/null => "missing"
    const hasGoals = goalsCount > 0;
    const diff = savings - required;

    const status: Status =
        !hasSavingsAnswer ? "missing" :
            !hasGoals ? "noGoals" :
                diff >= 0 ? "fits" :
                    "deficit";

    const badge = getBadge(status, diff, money0);

    return (
        <WizardCard>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-wizard-text/80">Din sparplan</div>
                    <p className="mt-1 text-xs text-wizard-text/55">
                        Målen räknas inom ditt månadssparande (inte utöver).
                    </p>
                </div>

                <WizardBadge icon={badge.icon} text={badge.text} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <WizardStatTile
                    label="Du sparar"
                    value={
                        <>
                            <Money amount={savings} money0={money0} /> /mån
                        </>
                    }
                    tone={!hasSavingsAnswer ? "muted" : "neutral"}
                />
                <WizardStatTile label="Målen kräver" value={`${money0(required)} /mån`} tone={!hasGoals ? "muted" : "neutral"} />

                <StatusTile
                    status={status}
                    diff={diff}
                    money0={money0}
                    onGoToHabits={onGoToHabits}
                />
            </div>
        </WizardCard>
    );
}

function getBadge(status: Status, diff: number, money0: (n: number) => string) {
    switch (status) {
        case "fits":
            return { icon: <CheckCircle2 className="h-4 w-4 text-darkLimeGreen" />, text: "Rimligt" };
        case "deficit":
            return { icon: <AlertTriangle className="h-4 w-4 text-wizard-warning" />, text: `Gap: ${money0(Math.abs(diff))}/mån` };
        case "noGoals":
            return { icon: <HelpCircle className="h-4 w-4 text-wizard-text/55" />, text: "Inga mål än" };
        case "missing":
        default:
            return { icon: <HelpCircle className="h-4 w-4 text-wizard-text/55" />, text: "Sparvanor saknas" };
    }
}

function StatusTile({
    status,
    diff,
    money0,
    onGoToHabits,
}: {
    status: Status;
    diff: number;
    money0: (n: number) => string;
    onGoToHabits?: () => void;
}) {
    if (status === "fits") {
        return (
            <WizardStatTile
                label="Status"
                value={
                    <>
                        Kvar: <Money amount={diff} money0={money0} /> /mån
                    </>
                }
            />
        );
    }

    if (status === "deficit") {
        return (
            <WizardStatTileWithCta
                label="Status"
                tone="warn"
                value={
                    <>
                        Saknas: <Money amount={diff} money0={money0} abs /> /mån
                    </>
                }
                cta={onGoToHabits ? { label: "Justera sparvanor", onClick: onGoToHabits } : undefined}
            />
        );
    }

    if (status === "noGoals") {
        return <WizardStatTile label="Status" value="Inga mål än" tone="muted" />;
    }

    // missing
    return (
        <WizardStatTileWithCta
            label="Status"
            value="Sparvanor saknas"
            tone="muted"
            cta={onGoToHabits ? { label: "Ange sparvanor", onClick: onGoToHabits } : undefined}
        />
    );
}


import clsx from "clsx";

function Money({
    amount,
    money0,
    abs = false,
}: {
    amount: number;
    money0: (n: number) => string;
    abs?: boolean; // if you WANT abs formatting
}) {
    const display = abs ? Math.abs(amount) : amount;

    return (
        <span
            className={clsx(
                "tabular-nums font-semibold",
                amount > 0 ? "text-darkLimeGreen" : "text-wizard-text/85"
            )}
        >
            {money0(display)}
        </span>
    );
}