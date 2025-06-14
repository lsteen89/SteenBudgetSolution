import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/* ─────────────────────────── types ─────────────────────────── */

type SubExpense = {
  name: string;
  value: number;
};

type Category = {
  name: string;
  value: number;
  icon: React.ReactNode;
  breakdown: SubExpense[];
};

interface Props {
  categories: Category[];
  grandTotal: number;
  openCategory: string | null;
  setOpenCategory: (name: string | null) => void;
}

/* ───────────────── Sub-Components for Clarity ────────────────── */

// Renders the individual sub-expense line item with its own animation variant
const SubExpenseRow: React.FC<{ item: SubExpense }> = ({ item }) => {
  const rowVariants = {
    collapsed: { opacity: 0, y: -10 },
    open: { opacity: 1, y: 0 },
  };

  return (
    <motion.div variants={rowVariants}>
      <div className="flex flex-col border-t border-white/5 py-2 pl-8 pr-4 text-sm text-white/80 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-white/90">{item.name}</span>
        <span className="font-mono">{`${item.value.toLocaleString("sv-SE")} kr`}</span>
      </div>
    </motion.div>
  );
};

// Renders the main, clickable category row
const CategoryRow: React.FC<{
  category: Category;
  isOpen: boolean;
  onToggle: () => void;
  grandTotal: number;
}> = ({ category, isOpen, onToggle, grandTotal }) => {
  const percentage = grandTotal > 0 ? (category.value / grandTotal) * 100 : 0;

  // Variants for the container to orchestrate the stagger effect
  const containerVariants = {
    open: {
      transition: { staggerChildren: 0.06, delayChildren: 0.1 },
    },
    collapsed: {
      transition: { staggerChildren: 0.04, staggerDirection: -1 },
    },
  };

  return (
    <motion.div
      layout="position"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      initial={false}
      className="bg-white/5 rounded-lg mb-2 overflow-hidden shadow-md"
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-wrap items-center gap-x-2 gap-y-2 p-4 text-left font-semibold"
      >
        {/* Group 1: Icon and Name */}
        <div className="flex flex-grow items-center">
          <div className="mr-3 flex h-6 w-6 items-center justify-center text-darkLimeGreen">
            {category.icon}
          </div>
          <span className="flex-1 text-base">{category.name}</span>
        </div>

        {/* Group 2: Value and Chevron */}
        <div className="flex flex-shrink-0 items-center">
          <span className="mr-4 hidden font-mono text-base md:inline">
            {`${category.value.toLocaleString("sv-SE")} kr`}
          </span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }}>
            <ChevronDown className="h-5 w-5" />
          </motion.div>
        </div>

        {/* This layout is ONLY for mobile (md:hidden) */}
        <div className="w-full md:hidden">
          <div className="flex items-center gap-3">
            <div className="h-2 w-full flex-grow rounded-full bg-white/10">
              <motion.div
                className="h-2 rounded-full bg-darkLimeGreen"
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <span className="flex-shrink-0 text-xs font-bold text-white/80">
              {`${category.value.toLocaleString("sv-SE")} kr`}
            </span>
          </div>
        </div>

        {/* This simple bar is ONLY for desktop (hidden on mobile) */}
        <div className="hidden h-2 w-full rounded-full bg-white/10 md:block">
          <motion.div
            className="h-2 rounded-full bg-darkLimeGreen"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.section
            key="content"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={containerVariants}
            style={{ overflow: 'hidden' }}
            className="pb-2"
          >
            {category.breakdown.map((item) => (
              <SubExpenseRow key={item.name} item={item} />
            ))}
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ────────────────── Main Accordion Component ─────────────────── */

const ExpenditureAccordion: React.FC<Props> = ({
  categories,
  grandTotal,
  openCategory,
  setOpenCategory,
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto">
      {categories.map((category) => (
        <CategoryRow
          key={category.name}
          category={category}
          grandTotal={grandTotal}
          isOpen={openCategory === category.name}
          onToggle={() => setOpenCategory(openCategory === category.name ? null : category.name)}
        />
      ))}
    </div>
  );
};

export default ExpenditureAccordion;