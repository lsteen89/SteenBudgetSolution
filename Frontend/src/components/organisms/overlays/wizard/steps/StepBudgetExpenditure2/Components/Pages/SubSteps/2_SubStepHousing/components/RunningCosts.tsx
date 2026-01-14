import React, { useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { ExpenditureFormValues } from "@/types/Wizard/ExpenditureFormValues";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { useAppCurrency, useAppLocale } from "@/hooks/i18n/useAppCurrency";

const RunningCosts: React.FC = () => {
    const {
        register,
        watch,
        getFieldState,
        formState,
    } = useFormContext<ExpenditureFormValues>();

    const currency = useAppCurrency();
    const locale = useAppLocale();

    const values = watch("housing.runningCosts");

    const total = useMemo(() => {
        if (!values) return 0;
        return Object.values(values).reduce((acc, val) => acc + (Number(val) || 0), 0);
    }, [values]);

    const err = (path: Parameters<typeof getFieldState>[0]) =>
        getFieldState(path, formState).error?.message;

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-end mb-4">
                <div>
                    <h4 className="text-lg font-bold text-darkLimeGreen">Driftskostnader</h4>
                    <p className="text-sm text-darkLimeGreen">Månadskostnader för hemmet</p>
                </div>

                <div className="text-right">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Totalt
                    </span>
                    <p className="text-xl font-black text-darkLimeGreen">
                        {formatMoneyV2(total, currency, locale, { fractionDigits: 0 })}
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberInput
                    label="El"
                    currency={currency}
                    locale={locale}
                    error={err("housing.runningCosts.electricity")}
                    {...register("housing.runningCosts.electricity", { valueAsNumber: true })}
                />
                <NumberInput
                    label="Uppvärmning"
                    currency={currency}
                    locale={locale}
                    error={err("housing.runningCosts.heating")}
                    {...register("housing.runningCosts.heating", { valueAsNumber: true })}
                />
                <NumberInput
                    label="Vatten & Avlopp"
                    currency={currency}
                    locale={locale}
                    error={err("housing.runningCosts.water")}
                    {...register("housing.runningCosts.water", { valueAsNumber: true })}
                />
                <NumberInput
                    label="Sophämtning"
                    currency={currency}
                    locale={locale}
                    error={err("housing.runningCosts.waste")}
                    {...register("housing.runningCosts.waste", { valueAsNumber: true })}
                />
            </div>
        </div>
    );
};

export default RunningCosts;
