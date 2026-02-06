import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import WizardStatTile from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTile";
import WizardStatTileWithCta from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTileWithCta";
import WizardBadge from "@/components/organisms/overlays/wizard/SharedComponents/Badge/WizardBadge";
import { useWizard } from "@/context/WizardContext";

type Status = "ok" | "incomplete";

type Props = {
    debtsCount: number;
    totalBalance: number;
    estMonthlyTotal: number;
    incompleteCount: number;
};

export default function DebtsPlanSummaryCard({
    debtsCount,
    totalBalance,
    estMonthlyTotal,
    incompleteCount,
}: Props) {
    const currency = useAppCurrency();
    const locale = useAppLocale();


    const money0 = React.useCallback(
        (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
        [currency, locale]
    );

    // ✅ If there are no debts, incomplete doesn't matter
    const safeIncomplete = debtsCount === 0 ? 0 : incompleteCount;
    const status: Status = safeIncomplete > 0 ? "incomplete" : "ok";

    const badge = getBadge(status, safeIncomplete);

    const { openModal } = useWizard();

    const onFix = React.useCallback(() => {
        openModal("debtTemplate");
    }, [openModal]);

    return (
        <WizardCard>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-wizard-text/80">Skuldöversikt</div>
                    <p className="mt-1 text-xs text-wizard-text/55">
                        Visar total skuld och en uppskattad månadskostnad.
                    </p>
                </div>

                <WizardBadge icon={badge.icon} text={badge.text} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <WizardStatTile
                    label="Total skuld"
                    value={money0(totalBalance)}
                    tone={debtsCount === 0 ? "muted" : "neutral"}
                />

                <WizardStatTile
                    label="Uppskattat / mån"
                    value={`${money0(estMonthlyTotal)} /mån`}
                    tone={debtsCount === 0 ? "muted" : "neutral"}
                />

                <StatusTile status={status} incompleteCount={safeIncomplete} onFix={onFix} />
            </div>
        </WizardCard>
    );
}

function getBadge(status: Status, incompleteCount: number) {
    if (status === "ok") {
        return {
            icon: <CheckCircle2 className="h-4 w-4 text-darkLimeGreen" />,
            text: "Klart",
        };
    }

    return {
        icon: <AlertTriangle className="h-4 w-4 text-wizard-warning" />,
        text: `${incompleteCount} saknar uppgift`,
    };
}

function StatusTile({
    status,
    incompleteCount,
    onFix,
}: {
    status: Status;
    incompleteCount: number;
    onFix: () => void;
}) {
    if (status === "ok") {
        return <WizardStatTile label="Status" value="Allt ifyllt" tone="neutral" />;
    }

    return (
        <WizardStatTileWithCta
            label="Status"
            tone="warn"
            value={`${incompleteCount} skuld${incompleteCount === 1 ? "" : "er"} saknar uppgift`}
            cta={{ label: "Fyll i uppgifter", onClick: onFix }}
        />
    );
}
