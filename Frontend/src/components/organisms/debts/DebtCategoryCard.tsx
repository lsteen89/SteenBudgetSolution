import React from "react";
import { motion } from "framer-motion";
import { DebtItem } from "@/types/Wizard/DebtFormValues";
import DebtGroup from "./DebtGroup";

interface DebtCategoryCardProps {
  icon: React.ReactNode;
  title: string;
  summary: {
    items: DebtItem[];
    count: number;
    totalBalance: number;
  };
}

export const DebtCategoryCard: React.FC<DebtCategoryCardProps> = ({ icon, title, summary }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
  >
    <div className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
      {/* Left: Icon + title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 text-darkLimeGreen">{icon}</div>
        <h4 className="min-w-0 text-lg font-bold text-white truncate">{title}</h4>
      </div>

      {/* Right (sm+): compact stats */}
      <div className="hidden sm:block text-right">
        <div className="text-sm font-semibold text-white tabular-nums whitespace-nowrap">
          {summary.totalBalance.toLocaleString("sv-SE")} kr
        </div>
        <div className="text-xs text-white/60 whitespace-nowrap">{summary.count} st</div>
      </div>
    </div>

    {/* Mobile-only: full-width total on its own row */}
    <div className="sm:hidden">
      <div className="text-xl font-extrabold text-white tabular-nums whitespace-nowrap">
        {summary.totalBalance.toLocaleString("sv-SE")} kr
      </div>
      <div className="mt-1 text-xs text-white/60">{summary.count} st</div>
    </div>

    {/* List */}
    <div className="mt-4 border-t border-white/10 pt-4">
      <DebtGroup title={title} debts={summary.items} />
    </div>
  </motion.div>
);

