import React, { useEffect, useMemo, useRef, useState } from "react";
import { useController, useFormContext, useWatch } from "react-hook-form";

import CheckboxOption from "@/components/atoms/InputField/CheckboxOption";
import EditableSavingsInput from "@/components/molecules/InputField/EditableSavingsInput";
import InfoBox from "@/components/molecules/messaging/InfoBox";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";
import { idFromPath } from "@/utils/idFromPath";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

import { WizardAccordion, WizardAccordionRoot } from "@/components/organisms/overlays/wizard/SharedComponents/Accordion/WizardAccordion";
import type { Step3FormValues } from "@/types/Wizard/Step3_Savings/Step3FormValues";

export type SavingsMethodOption<T extends string = string> = {
    value: T;
    label: string;
};

type Props<TMethod extends string> = {
    idBasePath: string;
    sliderSoftMax: number;
    inputHardMax?: number;
    options: Array<SavingsMethodOption<TMethod>>;
    sliderHint?: React.ReactNode;
    monthlyIncome?: number;
    markers?: { value: number; label?: string; className?: string }[];
    showMethods?: boolean;
    methodsDefaultCollapsed?: boolean;
    monthlyLabel?: string;
    methodsLabel?: string;
};

export default function SavingsHabitsCard<TMethod extends string>({
    idBasePath,
    sliderSoftMax,
    inputHardMax,
    options,
    monthlyLabel = "Ungefär hur mycket sparar du varje månad?",
    methodsLabel = "Hur brukar du spara? (Välj alla som passar)",
    sliderHint,
    monthlyIncome,
    markers,
    showMethods,
    methodsDefaultCollapsed,
}: Props<TMethod>) {
    const { control, setValue } = useFormContext<Step3FormValues>();

    // --- RHF subscriptions (stable, no flicker)
    const monthly = useController({
        control,
        name: "habits.monthlySavings",
    });

    const methods = useController({
        control,
        name: "habits.savingMethods",
    });

    const monthlySavings = (monthly.field.value ?? null) as number | null;
    const savingMethods = (methods.field.value ?? []) as TMethod[];

    const monthlySavingsError = monthly.fieldState.error?.message;
    const savingMethodsError = methods.fieldState.error?.message;

    const locale = useAppLocale();
    const currency = useAppCurrency();

    const money0 = React.useCallback(
        (n: number) => formatMoneyV2(n, currency, locale, { fractionDigits: 0 }),
        [currency, locale]
    );

    const savingsRate =
        monthlyIncome && monthlyIncome > 0 ? (monthlySavings ?? 0) / monthlyIncome : null;

    const pct = savingsRate !== null ? Math.min(999, Math.round(savingsRate * 100)) : null;
    const pctLabel = pct !== null ? `${pct}% av inkomsten` : undefined;

    const monthlyId = idFromPath(`${idBasePath}.monthlySavings`);
    const monthlyLabelId = `${monthlyId}-label`;

    const methodsBaseId = idFromPath(`${idBasePath}.savingMethods`);

    const showMethodsSection = showMethods ?? true;

    // summary text for collapsed trigger
    const selectedSummary = useMemo(() => {
        if (!savingMethods?.length) return "Inte angivet";
        if ((savingMethods as string[]).includes("prefer_not")) return "Vill inte ange";
        return savingMethods.length === 1 ? "1 val" : `${savingMethods.length} val`;
    }, [savingMethods]);

    // progressive disclosure
    const [methodsOpen, setMethodsOpen] = useState<string>("");
    const autoOpenedRef = useRef(false);

    const shouldAutoOpen = (showMethods ?? true) && (monthlySavings ?? 0) > 0;

    useEffect(() => {
        if (!shouldAutoOpen) return;
        if (autoOpenedRef.current) return;
        autoOpenedRef.current = true;
        setMethodsOpen("methods");
    }, [shouldAutoOpen]);

    // if monthlySavings goes to 0/null -> clear methods (your existing rule)
    const monthlySavingsNum = typeof monthlySavings === "number" ? monthlySavings : 0;
    useEffect(() => {
        if (monthlySavingsNum <= 0 && (savingMethods?.length ?? 0) > 0) {
            methods.field.onChange([]); // ✅ keeps RHF consistent
        }
    }, [monthlySavingsNum, savingMethods, methods.field]);

    const toggleMethod = (value: TMethod) => {
        const current = Array.isArray(savingMethods) ? [...savingMethods] : [];

        if (value === ("prefer_not" as TMethod)) {
            const next = current.includes("prefer_not" as TMethod) ? [] : [("prefer_not" as TMethod)];
            methods.field.onChange(next);
            return;
        }

        const filtered = current.filter((v) => v !== ("prefer_not" as TMethod));
        const idx = filtered.indexOf(value);
        const next = idx > -1 ? filtered.filter((v) => v !== value) : [...filtered, value];

        methods.field.onChange(next);
    };

    return (
        <WizardCard>
            <div className="space-y-6">
                <div className="text-center">
                    <label id={monthlyLabelId} className="block text-sm font-medium text-wizard-text/70 mb-3">
                        {monthlyLabel}
                    </label>

                    <EditableSavingsInput
                        id={monthlyId}
                        value={monthlySavings}
                        softMax={sliderSoftMax}
                        hardMax={inputHardMax}
                        formatValue={money0}
                        onChange={(v) => {
                            monthly.field.onChange(v);
                        }}
                        onBlur={monthly.field.onBlur}
                        ariaLabelledBy={monthlyLabelId}
                        markers={markers}
                        sliderValueLabel={pctLabel}
                    />

                    {sliderHint ? <div className="mt-1">{sliderHint}</div> : null}

                    <div className="mt-2 min-h-[20px]">
                        {monthlySavingsError ? (
                            <p className="text-sm font-semibold text-wizard-warning" role="alert">
                                {monthlySavingsError}
                            </p>
                        ) : null}
                    </div>
                </div>

                {showMethodsSection && (
                    <div className="relative">
                        <WizardAccordionRoot
                            type="single"
                            collapsible
                            value={methodsOpen}
                            onValueChange={(v) => setMethodsOpen(v)}
                        >
                            <WizardAccordion
                                value="methods"
                                variant="shell"
                                title={
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-wizard-text font-semibold">{methodsLabel}</span>
                                        <span className="text-wizard-text/45 font-normal text-sm">(valfritt)</span>
                                    </div>
                                }
                                subtitle={
                                    <span className="text-sm text-wizard-text/65">
                                        {(monthlySavings ?? 0) > 0
                                            ? "Hjälper oss ge smartare förslag."
                                            : "Du kan fylla i detta senare."}
                                    </span>
                                }
                                totalText={selectedSummary}
                                totalSuffix=""
                                isActive={methodsOpen === "methods"}
                            >
                                <div className="space-y-3" role="group" aria-label="Hur brukar du spara?">
                                    {options.map((o) => (
                                        <CheckboxOption
                                            key={o.value}
                                            id={`${methodsBaseId}-${o.value}`}
                                            label={o.label}
                                            value={o.value}
                                            checked={savingMethods.includes(o.value)}
                                            onChange={() => toggleMethod(o.value)}
                                        />
                                    ))}
                                </div>

                                {savingMethodsError ? (
                                    <p className="mt-2 text-sm font-semibold text-wizard-warning" role="alert">
                                        {savingMethodsError}
                                    </p>
                                ) : null}

                                <div className="mt-3">
                                    <InfoBox>
                                        Hur du sparar påverkar stabiliteten. Om du sparar manuellt kan vi senare tipsa om automatiska
                                        överföringar om dina mål inte nås. Vill du inte svara är det helt okej – välj bara “Vill inte ange”.
                                    </InfoBox>
                                </div>
                            </WizardAccordion>
                        </WizardAccordionRoot>

                    </div>
                )}
            </div>
        </WizardCard>
    );
}
