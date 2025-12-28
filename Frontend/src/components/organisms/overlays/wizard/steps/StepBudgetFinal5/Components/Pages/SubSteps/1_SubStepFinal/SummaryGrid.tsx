import React from "react";
import { cn } from "@/utils/cn";
import formatCurrency from "@/utils/money/currencyFormatter";

interface Row { label: string; value: number; }
interface Props {
  title: string;
  topRows?: Row[];
  rows: Row[];
  resultLabel?: string;
  resultValue?: number;
}

const SummaryRow = ({ label, value }: { label: string; value: number }) => (
  <li className="flex flex-col sm:grid sm:grid-cols-[max-content_auto] sm:items-center gap-x-4 sm:gap-x-6 py-1">
    <span className="text-xs sm:text-base font-semibold text-white/70 uppercase tracking-wider">
      {label}
    </span>
    <span className="text-lg sm:text-right font-mono text-white">
      {formatCurrency(value)}
    </span>
  </li>
);

const Section = ({ rows }: { rows: Row[] }) => (
  <ul className="space-y-3 sm:space-y-0">
    {rows.map(r => (
      <SummaryRow key={r.label} label={r.label} value={r.value} />
    ))}
  </ul>
);

export const SummaryGrid: React.FC<Props> = ({
  title,
  topRows,
  rows,
  resultLabel,
  resultValue,
}) => (
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
          <Section rows={topRows} />
          <hr className="col-span-full my-4 border-white/20" />
          <p className="text-xs uppercase tracking-wider text-white/50">
            Utgifter per kategori
          </p>
        </>
      )}

      <Section rows={rows} />

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
              {formatCurrency(resultValue ?? 0)}
            </span>
          </div>
        </>
      )}
    </div>
  </div>
);

