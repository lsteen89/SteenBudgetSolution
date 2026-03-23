import { Car, CreditCard, Home, Receipt, Users } from "lucide-react";
import React, { useMemo } from "react";

import { TemplatePickerModal } from "@/components/organisms/modals/TemplatePickerModal";
import { getDebtTemplates } from "@/components/organisms/modals/templates/debtTemplates";
import type { DebtTemplate, DebtTemplateId } from "@/types/modal/debts";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { debtTemplateModalDict } from "@/utils/i18n/wizard/stepDebt/DebtTemplateModal.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tpl: DebtTemplate) => void;
  onSelectBlank: () => void;
};

const iconMap: Partial<Record<DebtTemplateId, React.ReactNode>> = {
  credit_card: <CreditCard className="h-6 w-6 text-limeGreen/90" />,
  mortgage: <Home className="h-6 w-6 text-limeGreen/90" />,
  car_loan: <Car className="h-6 w-6 text-limeGreen/90" />,
  personal_loan: <Users className="h-6 w-6 text-limeGreen/90" />,
  installment: <Receipt className="h-6 w-6 text-limeGreen/90" />,
};

export function DebtTemplateModal({
  isOpen,
  onClose,
  onSelect,
  onSelectBlank,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof debtTemplateModalDict.sv>(k: K) =>
    tDict(k, locale, debtTemplateModalDict);

  const debtTemplates = useMemo(() => getDebtTemplates(locale), [locale]);

  const money0 = (v: number) =>
    formatMoneyV2(v, currency, locale, { fractionDigits: 0 });

  function debtMeta(template: DebtTemplate) {
    const desc =
      template.type === "revolving"
        ? t("metaMinPaymentTemplate").replace(
            "{amount}",
            money0(template.minPayment ?? 0),
          )
        : template.type === "private"
          ? t("metaFlexibleRepayment")
          : t("metaTermTemplate").replace(
              "{months}",
              String(template.termMonths ?? 0),
            );

    const fee =
      template.monthlyFee && template.monthlyFee > 0
        ? ` ${t("metaMonthlyFeeTemplate").replace(
            "{amount}",
            money0(template.monthlyFee),
          )}`
        : "";

    return (
      <>
        {desc} · {template.apr}%{fee} · {money0(template.balance)}
      </>
    );
  }

  return (
    <TemplatePickerModal<DebtTemplate, DebtTemplateId>
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("ariaLabel")}
      title={t("title")}
      description={t("description")}
      templates={debtTemplates}
      iconMap={iconMap}
      onSelect={onSelect}
      onSelectBlank={onSelectBlank}
      blankTitle={t("blankTitle")}
      blankDescription={t("blankDescription")}
      renderMeta={debtMeta}
      defaultIcon={<CreditCard className="h-6 w-6 text-limeGreen/90" />}
    />
  );
}
