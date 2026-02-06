import React from "react";
import { PiggyBank, Car, Home, Plane } from "lucide-react";
import { TemplatePickerModal } from "@/components/organisms/modals/TemplatePickerModal";
import { goalTemplates } from "@/components/organisms/modals/templates/goalTemplates";
import type { GoalTemplate } from "@/types/modal/savings";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { GoalTemplateName } from "@/types/modal/savings";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (template: GoalTemplate) => void;
    onSelectBlank: () => void;
};

const iconMap: Partial<Record<GoalTemplateName, React.ReactNode>> = {
    Buffert: <PiggyBank className="h-6 w-6 text-limeGreen/90" />,
    "Ny bil": <Car className="h-6 w-6 text-limeGreen/90" />,
    Kontantinsats: <Home className="h-6 w-6 text-limeGreen/90" />,
    "Resa till solen": <Plane className="h-6 w-6 text-limeGreen/90" />,
};

export function GoalTemplateModal({
    isOpen,
    onClose,
    onSelect,
    onSelectBlank,
}: Props) {
    const currency = useAppCurrency();
    const locale = useAppLocale();

    return (
        <TemplatePickerModal<GoalTemplate>
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Välj en mall för ditt sparmål"
            title="Välj en mall för ditt sparmål"
            description="Starta snabbt med en vanlig mall, eller bygg ditt eget mål."
            templates={goalTemplates}
            iconMap={iconMap}
            onSelect={onSelect}
            onSelectBlank={onSelectBlank}
            blankTitle="Skapa eget mål"
            blankDescription="Eget namn, eget belopp."
            renderMeta={(t) => formatMoneyV2(t.targetAmount, currency, locale, { fractionDigits: 0 })}
            defaultIcon={<PiggyBank className="h-6 w-6 text-limeGreen/90" />}
        />
    );
}
