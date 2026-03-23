import clsx from "clsx";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import React from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { savingsPlanSummaryCardDict } from "@/utils/i18n/wizard/stepSavings/SavingsPlanSummaryCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import WizardBadge from "@/components/organisms/overlays/wizard/SharedComponents/Badge/WizardBadge";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import WizardStatTile from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTile";
import WizardStatTileWithCta from "@/components/organisms/overlays/wizard/SharedComponents/Stat/WizardStatTileWithCta";

type Status = "missing" | "noGoals" | "fits" | "deficit";

type Props = {
  monthlySavings: number | null;
  requiredTotal: number;
  goalsCount: number;
  onGoToHabits?: () => void;
};

export default function SavingsPlanSummaryCard({
  monthlySavings,
  requiredTotal,
  goalsCount,
  onGoToHabits,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof savingsPlanSummaryCardDict.sv>(k: K) =>
    tDict(k, locale, savingsPlanSummaryCardDict);

  const money0 = React.useCallback(
    (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const savings =
    typeof monthlySavings === "number" && Number.isFinite(monthlySavings)
      ? monthlySavings
      : 0;

  const required = Number.isFinite(requiredTotal) ? requiredTotal : 0;

  const hasSavingsAnswer = savings > 0;
  const hasGoals = goalsCount > 0;
  const diff = savings - required;

  const status: Status = !hasSavingsAnswer
    ? "missing"
    : !hasGoals
      ? "noGoals"
      : diff >= 0
        ? "fits"
        : "deficit";

  const badge = getBadge(status, diff, money0, t);

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
          label={t("labelYouSave")}
          value={
            <>
              <Money amount={savings} money0={money0} /> {t("suffixPerMonth")}
            </>
          }
          tone={!hasSavingsAnswer ? "muted" : "neutral"}
        />

        <WizardStatTile
          label={t("labelGoalsRequire")}
          value={`${money0(required)} ${t("suffixPerMonth")}`}
          tone={!hasGoals ? "muted" : "neutral"}
        />

        <StatusTile
          status={status}
          diff={diff}
          money0={money0}
          onGoToHabits={onGoToHabits}
          t={t}
        />
      </div>
    </WizardCard>
  );
}

function getBadge(
  status: Status,
  diff: number,
  money0: (n: number) => string,
  t: <K extends keyof typeof savingsPlanSummaryCardDict.sv>(k: K) => string,
) {
  switch (status) {
    case "fits":
      return {
        icon: <CheckCircle2 className="h-4 w-4 text-darkLimeGreen" />,
        text: t("badgeReasonable"),
      };

    case "deficit":
      return {
        icon: <AlertTriangle className="h-4 w-4 text-wizard-warning" />,
        text: t("badgeGapTemplate").replace("{amount}", money0(Math.abs(diff))),
      };

    case "noGoals":
      return {
        icon: <HelpCircle className="h-4 w-4 text-wizard-text/55" />,
        text: t("badgeNoGoals"),
      };

    case "missing":
    default:
      return {
        icon: <HelpCircle className="h-4 w-4 text-wizard-text/55" />,
        text: t("badgeMissingHabits"),
      };
  }
}

function StatusTile({
  status,
  diff,
  money0,
  onGoToHabits,
  t,
}: {
  status: Status;
  diff: number;
  money0: (n: number) => string;
  onGoToHabits?: () => void;
  t: <K extends keyof typeof savingsPlanSummaryCardDict.sv>(k: K) => string;
}) {
  if (status === "fits") {
    return (
      <WizardStatTile
        label={t("labelStatus")}
        value={t("statusRemainingTemplate").replace("{amount}", money0(diff))}
      />
    );
  }

  if (status === "deficit") {
    return (
      <WizardStatTileWithCta
        label={t("labelStatus")}
        tone="warn"
        value={t("statusMissingTemplate").replace(
          "{amount}",
          money0(Math.abs(diff)),
        )}
        cta={
          onGoToHabits
            ? { label: t("ctaAdjustHabits"), onClick: onGoToHabits }
            : undefined
        }
      />
    );
  }

  if (status === "noGoals") {
    return (
      <WizardStatTile
        label={t("labelStatus")}
        value={t("badgeNoGoals")}
        tone="muted"
      />
    );
  }

  return (
    <WizardStatTileWithCta
      label={t("labelStatus")}
      value={t("badgeMissingHabits")}
      tone="muted"
      cta={
        onGoToHabits
          ? { label: t("ctaEnterHabits"), onClick: onGoToHabits }
          : undefined
      }
    />
  );
}

function Money({
  amount,
  money0,
  abs = false,
}: {
  amount: number;
  money0: (n: number) => string;
  abs?: boolean;
}) {
  const display = abs ? Math.abs(amount) : amount;

  return (
    <span
      className={clsx(
        "tabular-nums font-semibold",
        amount > 0 ? "text-darkLimeGreen" : "text-wizard-text/85",
      )}
    >
      {money0(display)}
    </span>
  );
}
