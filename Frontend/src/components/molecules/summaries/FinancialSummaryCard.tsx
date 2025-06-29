import React from 'react';
import { motion } from 'framer-motion';

interface FinancialSummaryCardProps {
  income: number;
  expenses: number;
  savings: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({ income, expenses, savings }) => {
  return (
    <motion.div
      className="text-center space-y-1 p-6 border-t border-white/20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
    >
      <p className="text-lg font-bold">
        Inkomst: {`${income.toLocaleString('sv-SE')} kr`}
      </p>
      <p className="text-lg font-bold">
        Utgifter: {`${expenses.toLocaleString('sv-SE')} kr`}
      </p>
      <p className={`text-xl font-bold ${savings >= 0 ? 'text-darkLimeGreen' : 'text-red-400'}`}>
        {savings >= 0 ? 'Kvar att spara: ' : 'Underskott: '}
        {`${Math.abs(savings).toLocaleString('sv-SE')} kr`}
      </p>
    </motion.div>
  );
};

export default FinancialSummaryCard;
