import React from "react";
import { cn } from "@/utils/cn";
import formatCurrency from "@/utils/budget/currencyFormatter";

interface Row { label: string; value: number; }
interface Props {
  title: string;
  rows: Row[];
  resultLabel?: string;
  resultValue?: number;
}
const SummaryRow = ({ label, value }: { label: string; value: number }) => (
  <li className="
        flex flex-col               /* phones: stack */
        sm:grid sm:grid-cols-[max-content_auto] sm:items-center
        gap-x-4 sm:gap-x-6 py-1
      ">
    <span className="text-xs sm:text-base font-semibold text-white/70 uppercase tracking-wider">
      {label}
    </span>
    <span className="text-lg sm:text-right font-mono text-white">
      {value.toLocaleString('sv-SE')} kr
    </span>
  </li>
);
export const SummaryGrid: React.FC<Props> = ({
  title,
  rows,
  resultLabel,
  resultValue,
}) => (
  <div className="mx-auto w-full max-w-sm sm:max-w-fit mb-4
                  bg-black/30 backdrop-blur-sm/6 p-6 rounded-xl shadow-lg">
    <div className="grid gap-y-2 sm:gap-y-1 gap-x-4 sm:gap-x-6 text-lg
                    grid-cols-1
                    sm:[grid-template-columns:max-content_auto]">

      {/* header */}
      <span className="col-span-full text-center text-xl font-bold text-darkLimeGreen">
        {title}
      </span>

      {/* rows */}
    {/* 👉 swap the old grid-for-rows for this list */}
    <ul className="space-y-3 sm:space-y-0">
      {rows.map(r => (
        <SummaryRow key={r.label} label={r.label} value={r.value} />
      ))}
    </ul>

      {/* divider + result */}
      {resultLabel && (
        <>
          <hr className="col-span-full my-4 border-white/20" />
          <span className="font-bold text-2xl text-left sm:text-right">
            {resultLabel}
          </span>
          <span
            className={cn(
              "font-bold text-2xl text-left sm:text-right",
              (resultValue ?? 0) < 0 ? "text-red-500" : "text-green-500",
            )}
          >
            {formatCurrency(resultValue ?? 0)}
          </span>
        </>
      )}
    </div>
  </div>
);
