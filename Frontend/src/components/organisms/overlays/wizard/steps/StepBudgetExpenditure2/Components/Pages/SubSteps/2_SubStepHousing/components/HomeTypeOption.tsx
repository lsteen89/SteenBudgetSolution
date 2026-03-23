import type { ExpenditureFormValues } from "@/types/Wizard/Step2_Expenditure/ExpenditureFormValues";
import type { HousingType } from "@/types/Wizard/Step2_Expenditure/HousingFormValues";
import React from "react";
import { useFormContext } from "react-hook-form";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { setValueAsLocalizedNumber } from "@/utils/forms/parseNumber";
import NumberInput from "@components/atoms/InputField/NumberInput";

import { ExtraFeesLabel } from "./ExtraFeesLabel";

import { tDict } from "@/utils/i18n/translate";
import { homeTypeOptionDict } from "@/utils/i18n/wizard/stepExpenditure/HomeTypeOption.i18n";

interface Props {
  homeType: HousingType | "";
}

const ExtraFeesHint = ({
  t,
}: {
  t: <K extends keyof typeof homeTypeOptionDict.sv>(k: K) => string;
}) => (
  <div className="mt-1 text-xs text-wizard-text/45 leading-relaxed space-y-1">
    <p>
      {t("hintIntroA")}{" "}
      <span className="text-wizard-text/70 font-semibold">
        {t("hintIntroB")}
      </span>{" "}
      {t("hintIntroC")}
    </p>

    <ul className="mt-1 space-y-0.5">
      <li>
        <span className="text-wizard-text/55">{t("hintParking")}</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">
          {t("hintTransport")}
        </span>
      </li>
      <li>
        <span className="text-wizard-text/55">{t("hintInternet")}</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">
          {t("hintFixed")}
        </span>
      </li>
      <li>
        <span className="text-wizard-text/55">{t("hintMandatory")}</span>{" "}
        <span className="text-wizard-text/40">→</span>{" "}
        <span className="text-darkLimeGreen/80 font-semibold">
          {t("hintHere")}
        </span>
      </li>
    </ul>
  </div>
);

const HomeTypeOption: React.FC<Props> = ({ homeType }) => {
  const { register, formState, getFieldState } =
    useFormContext<ExpenditureFormValues>();

  const currency = useAppCurrency();
  const locale = useAppLocale();
  const t = <K extends keyof typeof homeTypeOptionDict.sv>(k: K) =>
    tDict(k, locale, homeTypeOptionDict);

  const err = (path: Parameters<typeof getFieldState>[0]) =>
    getFieldState(path, formState).error?.message;

  if (!homeType) return null;

  return (
    <div className="space-y-4">
      {homeType === "rent" && (
        <NumberInput
          label={t("rentLabel")}
          currency={currency}
          locale={locale}
          error={err("housing.payment.monthlyRent")}
          {...register("housing.payment.monthlyRent", {
            setValueAs: setValueAsLocalizedNumber,
          })}
        />
      )}

      {homeType === "brf" && (
        <NumberInput
          label={t("brfLabel")}
          currency={currency}
          locale={locale}
          error={err("housing.payment.monthlyFee")}
          {...register("housing.payment.monthlyFee", {
            setValueAs: setValueAsLocalizedNumber,
          })}
        />
      )}

      {/* Shared for rent/brf/house */}
      <div>
        <NumberInput
          labelNode={<ExtraFeesLabel />}
          currency={currency}
          locale={locale}
          error={err("housing.payment.extraFees")}
          {...register("housing.payment.extraFees", {
            setValueAs: setValueAsLocalizedNumber,
          })}
        />

        <div className="pt-2">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-wizard-stroke bg-wizard-shell/70 px-4 py-3 shadow-sm shadow-black/10">
            <ExtraFeesHint t={t} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeTypeOption;
