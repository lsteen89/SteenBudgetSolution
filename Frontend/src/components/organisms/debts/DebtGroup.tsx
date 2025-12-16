import React from "react";
import { DebtItem } from "@/types/Wizard/DebtFormValues";

interface Props {
  title: string;
  debts: DebtItem[];
}

const DebtGroup: React.FC<Props> = ({ title, debts }) =>
  debts.length === 0 ? null : (
    <div>
      <h4 className="mb-2 text-lg font-semibold text-white">{title}</h4>

      <ul className="space-y-2">
        {debts.map((d) => {
          const balanceText = `${(d.balance ?? 0).toLocaleString("sv-SE")} kr`;
          const aprText =
            d.apr !== null && d.apr !== undefined ? `${Number(d.apr).toFixed(1)} %` : "–";

          return (
            <li
              key={d.id}
              className="rounded bg-slate-800/30 px-3 py-2 text-sm text-white/90"
            >
              {/* Mobile: stacked */}
              <div className="sm:hidden">
                <div className="font-medium truncate">{d.name}</div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-white/80">
                  <div className="tabular-nums whitespace-nowrap">{balanceText}</div>
                  <div className="text-right tabular-nums whitespace-nowrap">{aprText}</div>
                </div>
              </div>

              {/* sm+: grid row */}
              <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4">
                <span className="min-w-0 truncate">{d.name}</span>
                <span className="text-right tabular-nums whitespace-nowrap">{balanceText}</span>
                <span className="text-right tabular-nums whitespace-nowrap">{aprText}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

export default DebtGroup;
