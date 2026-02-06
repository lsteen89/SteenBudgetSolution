import React from "react";
import { Controller, Control } from "react-hook-form";
import type { CurrencyCode } from "@/utils/money/currency";

import { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import { idFromPath } from "@/utils/idFromPath";


import HomeTypeOption from "../components/HomeTypeOption";
import WizardSelect from "@components/atoms/InputField/WizardSelect";
import { WizardAccordion } from "@components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";

import { Home } from "lucide-react"; // ✅ icon

// Use your existing formatting util if you have one (recommended).
// Fallback uses Intl.
const formatMoney = (value: number, locale: string) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);

type Props = {
    control: Control<ExpenditureFormValues>;
    homeType?: ExpenditureFormValues["housing"]["homeType"];

    baseCost: number;
    currency: CurrencyCode;
    locale: string;
    totalText?: string;
};

const HousingCostAccordion: React.FC<Props> = ({
    control,
    homeType,
    baseCost,
    currency, // keep for later (if you format with currency symbols)
    locale,
    totalText,
}) => {
    const showTotal = baseCost > 0;


    return (
        <WizardAccordion
            value="housingMain"
            icon={<Home className="h-5 w-5 text-wizard-text" />}
            title="Boendekostnad"
            subtitle="Välj boendetyp och fyll i kostnader."
            meta={homeType ? `Typ: ${homeType}` : undefined}
            totalText={totalText}
            totalSuffix="   /mån"
            variant="shell"
        >
            <div className="space-y-6">
                <Controller
                    control={control}
                    name="housing.homeType"
                    render={({ field, fieldState }) => (
                        <WizardSelect
                            id={idFromPath(field.name)}
                            name={field.name}
                            label="Typ av boende"
                            ref={field.ref}
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value)}
                            onBlur={field.onBlur}
                            error={fieldState.error?.message}
                            options={[
                                { value: "", label: "Välj typ av boende...", disabled: true },
                                { value: "rent", label: "Hyresrätt" },
                                { value: "brf", label: "Bostadsrätt" },
                                { value: "house", label: "Hus" },
                                { value: "free", label: "Jag bor gratis!" },
                            ]}
                        />
                    )}
                />

                {homeType && homeType !== "free" && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <HomeTypeOption homeType={homeType} />
                    </div>
                )}
            </div>
        </WizardAccordion>
    );
};

export default HousingCostAccordion;
