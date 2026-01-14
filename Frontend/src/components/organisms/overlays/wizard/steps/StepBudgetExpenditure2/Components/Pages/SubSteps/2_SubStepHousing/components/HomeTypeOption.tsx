import React from "react";
import { useFormContext } from "react-hook-form";
import { ExpenditureFormValues, HousingType } from "@/types/Wizard/ExpenditureFormValues";
import NumberInput from "@components/atoms/InputField/NumberInput";
import { useAppCurrency, useAppLocale } from "@/hooks/i18n/useAppCurrency";

interface Props {
  homeType: HousingType | "";
}

const HomeTypeOption: React.FC<Props> = ({ homeType }) => {
  const { register, getFieldState, formState } = useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const err = (path: Parameters<typeof getFieldState>[0]) =>
    getFieldState(path, formState).error?.message;

  switch (homeType) {
    case "rent":
      return (
        <div className="space-y-4">
          <NumberInput
            label="Månadshyra"
            currency={currency}
            locale={locale}
            error={err("housing.payment.monthlyRent")}
            {...register("housing.payment.monthlyRent", { valueAsNumber: true })}
          />
          <NumberInput
            label="Extra avgifter (frivilligt)"
            currency={currency}
            locale={locale}
            error={err("housing.payment.extraFees")}
            {...register("housing.payment.extraFees", { valueAsNumber: true })}
          />
        </div>
      );

    case "brf":
      return (
        <div className="space-y-4">
          <NumberInput
            label="Månadsavgift"
            currency={currency}
            locale={locale}
            error={err("housing.payment.monthlyFee")}
            {...register("housing.payment.monthlyFee", { valueAsNumber: true })}
          />
          <NumberInput
            label="Extra avgifter (frivilligt)"
            currency={currency}
            locale={locale}
            error={err("housing.payment.extraFees")}
            {...register("housing.payment.extraFees", { valueAsNumber: true })}
          />
        </div>
      );

    case "house":
      return (
        <div className="space-y-4">
          <NumberInput
            label="Extra avgifter (frivilligt)"
            currency={currency}
            locale={locale}
            error={err("housing.payment.extraFees")}
            {...register("housing.payment.extraFees", { valueAsNumber: true })}
          />
        </div>
      );

    default:
      return null;
  }
};

export default HomeTypeOption;
