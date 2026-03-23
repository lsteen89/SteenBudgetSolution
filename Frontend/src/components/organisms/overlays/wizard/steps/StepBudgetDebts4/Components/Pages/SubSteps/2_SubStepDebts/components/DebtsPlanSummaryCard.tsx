import { AlertTriangle, CheckCircle2 } from "lucide-react";
import React from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { debtsPlanSummaryCardDict } from "@/utils/i18n/wizard/stepDebt/DebtsPlanSummaryCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import WizardBadge from "@/components/organisms/overlays/wizard/SharedComponents/Badge/WizardBadge";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import WizardStatTile from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTile";
import WizardStatTileWithCta from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTileWithCta";
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

  const t = <K extends keyof typeof debtsPlanSummaryCardDict.sv>(k: K) =>
    tDict(k, locale, debtsPlanSummaryCardDict);

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const safeIncomplete = debtsCount === 0 ? 0 : incompleteCount;
  const status: Status = safeIncomplete > 0 ? "incomplete" : "ok";

  const badge = getBadge(status, safeIncomplete, t);

  const { openModal } = useWizard();

  const onFix = React.useCallback(() => {
    openModal("debtTemplate");
  }, [openModal]);

  return (
    <WizardCard>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-wizard-text/80">
            {t("title")}
          </div>
          <p className="mt-1 text-xs text-wizard-text/55">{t("subtitle")}</p>
        </div>

        <WizardBadge icon={badge.icon} text={badge.text} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <WizardStatTile
          label={t("labelTotalDebt")}
          value={money0(totalBalance)}
          tone={debtsCount === 0 ? "muted" : "neutral"}
        />

        <WizardStatTile
          label={t("labelEstimatedPerMonth")}
          value={`${money0(estMonthlyTotal)} ${t("perMonthSuffix")}`}
          tone={debtsCount === 0 ? "muted" : "neutral"}
        />

        <StatusTile
          status={status}
          incompleteCount={safeIncomplete}
          onFix={onFix}
          t={t}
        />
      </div>
    </WizardCard>
  );
}

function getBadge(
  status: Status,
  incompleteCount: number,
  t: <K extends keyof typeof debtsPlanSummaryCardDict.sv>(k: K) => string,
) {
  if (status === "ok") {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-darkLimeGreen" />,
      text: t("badgeDone"),
    };
  }

  return {
    icon: <AlertTriangle className="h-4 w-4 text-wizard-warning" />,
    text: t("badgeMissingTemplate").replace("{count}", String(incompleteCount)),
  };
}

function StatusTile({
  status,
  incompleteCount,
  onFix,
  t,
}: {
  status: Status;
  incompleteCount: number;
  onFix: () => void;
  t: <K extends keyof typeof debtsPlanSummaryCardDict.sv>(k: K) => string;
}) {
  if (status === "ok") {
    return (
      <WizardStatTile
        label={t("labelStatus")}
        value={t("statusComplete")}
        tone="neutral"
      />
    );
  }

  const value =
    incompleteCount === 1
      ? t("statusMissingSingle")
      : t("statusMissingPluralTemplate").replace(
          "{count}",
          String(incompleteCount),
        );

  return (
    <WizardStatTileWithCta
      label={t("labelStatus")}
      tone="warn"
      value={value}
      cta={{ label: t("ctaFillIn"), onClick: onFix }}
    />
  );
}
