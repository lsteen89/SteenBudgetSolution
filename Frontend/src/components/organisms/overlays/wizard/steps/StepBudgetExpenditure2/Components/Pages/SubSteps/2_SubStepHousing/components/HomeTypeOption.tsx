import React from "react";
import { useFormContext } from "react-hook-form";
import type { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import type { HousingType } from "@/types/Wizard/Step2_Expenditure/HousingFormValues";

import NumberInput from "@components/atoms/InputField/NumberInput";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsSvNumber } from "@/utils/forms/parseNumber";
import { ExtraFeesLabel } from "./ExtraFeesLabel";

interface Props {
  homeType: HousingType | "";
}

const ExtraFeesHint = () => (
  <div className="mt-1 text-xs text-wizard-text/45 leading-relaxed space-y-1">
    <p>
      Endast <span className="text-wizard-text/70 font-semibold">obligatoriska boendeavgifter</span> kopplade till hyra/avgift.
    </p>

    <ul className="mt-1 space-y-0.5">
      <li>
        <span className="text-wizard-text/55">• Parkering som betalas separat</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">Transport</span>
      </li>
      <li>
        <span className="text-wizard-text/55">• Internet/TV som du kan välja själv</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">Fasta utgifter</span>
      </li>
      <li>
        <span className="text-wizard-text/55">• Obligatorisk avgift från hyresvärd/BRF</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">här</span>
      </li>
    </ul>
  </div>
);

const HomeTypeOption: React.FC<Props> = ({ homeType }) => {
  const { register, formState, getFieldState } = useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();

  const err = (path: Parameters<typeof getFieldState>[0]) =>
    getFieldState(path, formState).error?.message;

  if (!homeType) return null;

  return (
    <div className="space-y-4">
      {homeType === "rent" && (
        <NumberInput
          label="Månadshyra"
          currency={currency}
          locale={locale}
          error={err("housing.payment.monthlyRent")}
          {...register("housing.payment.monthlyRent", {
            setValueAs: setValueAsSvNumber,
          })}
        />
      )}

      {homeType === "brf" && (
        <NumberInput
          label="Månadsavgift"
          currency={currency}
          locale={locale}
          error={err("housing.payment.monthlyFee")}
          {...register("housing.payment.monthlyFee", {
            setValueAs: setValueAsSvNumber,
          })}
        />
      )}

      {/* Shared for rent/brf/house */}
      <div>
        <NumberInput
          labelNode={<ExtraFeesLabel />}
          label="Extra avgifter (frivilligt)"
          currency={currency}
          locale={locale}
          error={err("housing.payment.extraFees")}
          {...register("housing.payment.extraFees", {
            setValueAs: setValueAsSvNumber,
          })}
        />
        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-wizard-stroke bg-wizard-shell/70 px-4 py-3 shadow-sm shadow-black/10">
            <ExtraFeesHint />
          </div>
        </div>

      </div>
    </div>
  );
};

export default HomeTypeOption;
