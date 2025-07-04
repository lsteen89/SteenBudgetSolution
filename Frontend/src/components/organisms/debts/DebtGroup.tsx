import React from "react";
import { DebtItem } from "@/types/Wizard/DebtFormValues";

interface Props {
  title: string;
  debts: DebtItem[];
}
/**
 * DebtGroup component displays a list of debts with their details.
 * It renders a title and a list of debt items, each showing the name,
 * balance, and APR (Annual Percentage Rate).
 *
 * @param {Props} props - The properties for the DebtGroup component.
 * @returns {JSX.Element | null} - Returns a JSX element or null if no debts are provided.
 */
const DebtGroup: React.FC<Props> = ({ title, debts }) =>
  debts.length === 0 ? null : (
    <div>
      <h4 className="mb-2 text-lg font-semibold text-white">{title}</h4>

      <ul className="space-y-1">
        {debts.map(d => (
          <li
            key={d.id}
            className="grid grid-cols-4 gap-2 rounded bg-slate-800/30 px-3 py-2 text-sm text-white/90"
          >
            <span className="col-span-2">{d.name}</span>

            {/* balance */}
            <span className="text-right">
              {(d.balance ?? 0).toLocaleString("sv-SE")} kr
            </span>

            {/* APR – force number, fallback “–” */}
            <span className="text-right">
              {d.apr !== null && d.apr !== undefined
                ? Number(d.apr).toFixed(1) + " %"
                : "–"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
export default DebtGroup;
