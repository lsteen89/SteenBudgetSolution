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
    className="rounded-xl border border-white/10 bg-white/5 p-6"
  >
    {/* Header with Icon and Stats */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="text-darkLimeGreen">{icon}</div>
        <h4 className="text-lg font-bold text-white">{title}</h4>
      </div>
      <div className="mt-2 text-right text-sm md:mt-0">
        <span className="font-semibold text-white">
          {summary.totalBalance.toLocaleString("sv-SE")} kr
        </span>
        <span className="text-white/60"> ({summary.count} st)</span>
      </div>
    </div>

    {/* The list of debts */}
    <div className="mt-4 border-t border-white/10 pt-4">
      <DebtGroup title={title} debts={summary.items} />
    </div>
  </motion.div>
);