import React from "react";
import { cn } from "@/utils/cn";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import type { CurrencyCode } from "@/utils/money/currency";

interface Row { id: string; label: string; value: number; }

interface Props {
  title: string;
  topRows?: Row[];
  rows: Row[];
  resultLabel?: string;
  resultValue?: number;

  currency: CurrencyCode;
  locale?: string;
  money?: { fractionDigits?: 0 | 2 }; // optional convenience
}

const SummaryRow = ({
  label,
  value,
  currency,
  locale,
  fractionDigits = 0,
}: {
  label: string;
  value: number;
  currency: CurrencyCode;
  locale?: string;
  fractionDigits?: 0 | 2;
}) => (
  <li className="flex flex-col sm:grid sm:grid-cols-[max-content_auto] sm:items-center gap-x-4 sm:gap-x-6 py-1">
    <span className="text-xs sm:text-base font-semibold text-white/70 uppercase tracking-wider">
      {label}
    </span>
    <span className="text-lg sm:text-right font-mono text-white">
      {formatMoneyV2(value, currency, locale, { fractionDigits })}
    </span>
  </li>
);

const Section = ({
  rows,
  currency,
  locale,
  fractionDigits,
}: {
  rows: Row[];
  currency: CurrencyCode;
  locale?: string;
  fractionDigits?: 0 | 2;
}) => (
  <ul className="space-y-3 sm:space-y-0">
    {rows.map((r) => (
      <SummaryRow
        key={r.id}
        label={r.label}
        value={r.value}
        currency={currency}
        locale={locale}
        fractionDigits={fractionDigits}
      />
    ))}
  </ul>
);

export const SummaryGrid: React.FC<Props> = ({
  title,
  topRows,
  rows,
  resultLabel,
  resultValue,
  currency,
  locale = "sv-SE",
  money,
}) => {
  const fractionDigits = money?.fractionDigits ?? 0;

  return (
    <div className="w-full mb-4 bg-slate-800/50 rounded-2xl shadow-2xl p-6 md:p-8 border border-white/10">
      <div className="grid gap-y-2 sm:gap-y-1 gap-x-4 sm:gap-x-6 text-lg grid-cols-1">
        <span className="col-span-full text-center text-xl font-bold text-darkLimeGreen">
          {title}
        </span>

        {!!topRows?.length && (
          <>
            <p className="text-xs uppercase tracking-wider text-white/50 mt-2">
              Beräkning
            </p>
            <Section
              rows={topRows}
              currency={currency}
              locale={locale}
              fractionDigits={fractionDigits}
            />
            <hr className="col-span-full my-4 border-white/20" />
            <p className="text-xs uppercase tracking-wider text-white/50">
              Utgifter per kategori
            </p>
          </>
        )}

        <Section
          rows={rows}
          currency={currency}
          locale={locale}
          fractionDigits={fractionDigits}
        />

        {resultLabel && (
          <>
            <hr className="col-span-full my-4 border-white/20" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-2xl">{resultLabel}</span>
              <span
                className={cn(
                  "font-bold text-2xl",
                  (resultValue ?? 0) < 0 ? "text-red-500" : "text-green-500",
                )}
              >
                {formatMoneyV2(resultValue ?? 0, currency, locale, { fractionDigits })}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
