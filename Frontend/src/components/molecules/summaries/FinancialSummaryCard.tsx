import { motion } from "framer-motion";
import React from "react";

import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import { financialSummaryCardDict } from "@/utils/i18n/wizard/stepFinal/FinancialSummaryCard.i18n";
import { formatMoneyV2 } from "@/utils/money/moneyV2";

interface FinancialSummaryCardProps {
  income: number;
  expenses: number;
  savings: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  income,
  expenses,
  savings,
}) => {
  const locale = useAppLocale();
  const currency = useAppCurrency();

  const t = <K extends keyof typeof financialSummaryCardDict.sv>(k: K) =>
    tDict(k, locale, financialSummaryCardDict);

  const money0 = (v: number) =>
    formatMoneyV2(v ?? 0, currency, locale, { fractionDigits: 0 });

  return (
    <motion.div
      className="text-center space-y-1 p-6 border-t border-white/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-lg font-bold">
        {t("income")}: {money0(income)}
      </p>

      <p className="text-lg font-bold">
        {t("expenses")}: {money0(expenses)}
      </p>

      <p
        className={`text-xl font-bold ${
          savings >= 0 ? "text-darkLimeGreen" : "text-red-800"
        }`}
      >
        {savings >= 0 ? `${t("remainingToSave")}: ` : `${t("deficit")}: `}
        {money0(Math.abs(savings))}
      </p>
    </motion.div>
  );
};

export default FinancialSummaryCard;
