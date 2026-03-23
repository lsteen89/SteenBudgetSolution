import { Info, Trash2 } from "lucide-react";
import React from "react";
import { useFormContext, useWatch } from "react-hook-form";

import type { Step4FormValues } from "@/types/Wizard/Step4_Debt/Step4FormValues";
import type { DebtFromForm } from "@/utils/budget/debtMath";
import { isIncomplete, monthlyPayment, safeNum } from "@/utils/budget/debtMath";

import { WizardAccordion } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import DebtItemRow from "./DebtItemRow";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { debtItemAccordionDict } from "@/utils/i18n/wizard/stepDebt/DebtItemAccordion.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
  index: number;
  onRemove: (index: number) => void;
};

export default function DebtItemAccordion({ index, onRemove }: Props) {
  const { control } = useFormContext<Step4FormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof debtItemAccordionDict.sv>(k: K) =>
    tDict(k, locale, debtItemAccordionDict);

  const money0 = React.useMemo(
    () => (n: number) =>
      formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
    [currency, locale],
  );

  const typeLabel = React.useCallback(
    (type: DebtFromForm["type"] | undefined) => {
      switch (type) {
        case "bank_loan":
          return t("typeBankLoan");
        case "revolving":
          return t("typeRevolving");
        case "installment":
          return t("typeInstallment");
        case "private":
          return t("typePrivate");
        default:
          return t("typeUnknown");
      }
    },
    [t],
  );

  const base = `debts.${index}` as const;
  const d = useWatch({ control, name: base }) as DebtFromForm | undefined;

  const fallbackName = t("fallbackDebtName").replace(
    "{index}",
    String(index + 1),
  );
  const name = useWatch({ control, name: `${base}.name` }) ?? fallbackName;

  const type = useWatch({ control, name: `${base}.type` }) as
    | DebtFromForm["type"]
    | undefined;

  const pay = React.useMemo(() => {
    if (!d) return null;
    const p = monthlyPayment(d);
    return p > 0 ? p : null;
  }, [d]);

  const incomplete = React.useMemo(() => (d ? isIncomplete(d) : false), [d]);

  if (!d) return null;

  const rest = money0(safeNum(d.balance));
  const apr = safeNum(d.apr) ? String(safeNum(d.apr)) : "—";
  const term = safeNum(d.termMonths) ? String(safeNum(d.termMonths)) : "—";

  const title = (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span className="truncate text-wizard-text font-semibold">{name}</span>

        {incomplete ? (
          <span
            className="
              inline-flex w-fit shrink-0 items-center
              rounded-full border border-wizard-warning/25 bg-wizard-warning/10
              px-2 py-0.5 text-[11px] font-semibold text-wizard-warning
            "
          >
            {t("missingInfo")}
          </span>
        ) : null}
      </div>

      <div className="mt-0.5 text-[11px] text-wizard-text/55 sm:hidden">
        {typeLabel(type)} • {t("remainingLabel")}:{" "}
        <span className="tabular-nums font-semibold text-wizard-text/70">
          {rest}
        </span>
      </div>
    </div>
  );

  const subtitle = (
    <div className="text-xs text-wizard-text/65">
      <div className="hidden sm:block">
        {typeLabel(type)} <span className="text-wizard-text/35">•</span>{" "}
        {t("remainingLabel")}:{" "}
        <span className="tabular-nums font-semibold text-wizard-text/75">
          {rest}
        </span>
        {type !== "revolving" ? (
          <>
            {" "}
            <span className="text-wizard-text/35">•</span> {t("interestLabel")}:{" "}
            <span className="tabular-nums font-semibold text-wizard-text/75">
              {apr}
            </span>
            % <span className="text-wizard-text/35">•</span> {t("termLabel")}:{" "}
            <span className="tabular-nums font-semibold text-wizard-text/75">
              {term}
            </span>{" "}
            {t("monthsShort")}
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <WizardAccordion
      value={String(index)}
      title={title}
      subtitle={subtitle}
      totalText={pay ? money0(pay) : "—"}
      totalSuffix={t("perMonthSuffix")}
      actions={
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRemove(index);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove(index);
            }
          }}
          aria-label={t("removeDebtAria")}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-xl",
            "bg-wizard-surface border border-wizard-stroke/20",
            "text-wizard-text/60 shadow-sm shadow-black/5",
            "transition-colors cursor-pointer select-none",
            "hover:border-wizard-warning/30 hover:bg-wizard-warning/10 hover:text-wizard-warning",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45",
          )}
        >
          <Trash2 size={16} />
        </div>
      }
    >
      <DebtItemRow index={index} />

      <div className="mt-4 flex items-start gap-2 text-xs text-wizard-text/65">
        <Info size={14} className="mt-0.5 text-wizard-text/45 shrink-0" />
        <span>{t("footerHint")}</span>
      </div>
    </WizardAccordion>
  );
}
