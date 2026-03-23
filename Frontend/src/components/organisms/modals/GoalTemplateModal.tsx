import { Car, Home, PiggyBank, Plane } from "lucide-react";
import React, { useMemo } from "react";

import { TemplatePickerModal } from "@/components/organisms/modals/TemplatePickerModal";
import { getGoalTemplates } from "@/components/organisms/modals/templates/goalTemplates";
import type { GoalTemplate, GoalTemplateId } from "@/types/modal/savings";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { goalTemplateModalDict } from "@/utils/i18n/wizard/stepSavings/GoalTemplateModal.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: GoalTemplate) => void;
  onSelectBlank: () => void;
};

const iconMap: Partial<Record<GoalTemplateId, React.ReactNode>> = {
  buffer: <PiggyBank className="h-6 w-6 text-limeGreen/90" />,
  new_car: <Car className="h-6 w-6 text-limeGreen/90" />,
  down_payment: <Home className="h-6 w-6 text-limeGreen/90" />,
  sun_trip: <Plane className="h-6 w-6 text-limeGreen/90" />,
};

export function GoalTemplateModal({
  isOpen,
  onClose,
  onSelect,
  onSelectBlank,
}: Props) {
  const currency = useAppCurrency();
  const locale = useAppLocale();

  const t = <K extends keyof typeof goalTemplateModalDict.sv>(k: K) =>
    tDict(k, locale, goalTemplateModalDict);

  const goalTemplates = useMemo(() => getGoalTemplates(locale), [locale]);

  return (
    <TemplatePickerModal<GoalTemplate, GoalTemplateId>
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel={t("ariaLabel")}
      title={t("title")}
      description={t("description")}
      templates={goalTemplates}
      iconMap={iconMap}
      onSelect={onSelect}
      onSelectBlank={onSelectBlank}
      blankTitle={t("blankTitle")}
      blankDescription={t("blankDescription")}
      renderMeta={(template) =>
        formatMoneyV2(template.targetAmount, currency, locale, {
          fractionDigits: 0,
        })
      }
      defaultIcon={<PiggyBank className="h-6 w-6 text-limeGreen/90" />}
    />
  );
}
