import React from "react";
import { CreditCard, Car, Home, Receipt, Users } from "lucide-react";
import { TemplatePickerModal } from "@/components/organisms/modals/TemplatePickerModal";
import { debtTemplates } from "@/components/organisms/modals/templates/debtTemplates";
import type { DebtTemplate, DebtTemplateName, } from "@/types/modal/debts";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (tpl: DebtTemplate) => void;
    onSelectBlank: () => void;
};

const iconMap: Partial<Record<DebtTemplateName, React.ReactNode>> = {
    Kreditkort: <CreditCard className="h-6 w-6 text-limeGreen/90" />,
    Bolån: <Home className="h-6 w-6 text-limeGreen/90" />,
    Billån: <Car className="h-6 w-6 text-limeGreen/90" />,
    Privatlån: <Users className="h-6 w-6 text-limeGreen/90" />,
    Avbetalning: <Receipt className="h-6 w-6 text-limeGreen/90" />,
};

function debtMeta(tpl: DebtTemplate) {
    const desc =
        tpl.type === "revolving"
            ? `Minsta betalning ${tpl.minPayment!.toLocaleString("sv-SE")} kr`
            : tpl.type === "private"
                ? "Flexibel återbetalning"
                : `Löptid ${tpl.termMonths} mån`;

    const fee =
        tpl.monthlyFee && tpl.monthlyFee > 0
            ? ` + ${tpl.monthlyFee.toLocaleString("sv-SE")} kr/mån`
            : "";

    return (
        <>
            {desc} · {tpl.apr}%{fee} · {tpl.balance.toLocaleString("sv-SE")} kr
        </>
    );
}

export function DebtTemplateModal({
    isOpen,
    onClose,
    onSelect,
    onSelectBlank,
}: Props) {
    return (
        <TemplatePickerModal<DebtTemplate>
            isOpen={isOpen}
            onClose={onClose}
            ariaLabel="Välj en mall för din skuld"
            title="Välj en mall för din skuld"
            description="Starta snabbt med en vanlig mall, eller skapa en egen skuld."
            templates={debtTemplates}
            iconMap={iconMap}
            onSelect={onSelect}
            onSelectBlank={onSelectBlank}
            blankTitle="Skapa egen skuld"
            blankDescription="Eget namn, egna villkor."
            renderMeta={debtMeta}
        />
    );
}
