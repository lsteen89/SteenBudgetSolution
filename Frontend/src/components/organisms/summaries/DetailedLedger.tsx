import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ArrowRight } from 'lucide-react';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"; // Assuming you have this from shadcn/ui
import formatCurrency from '@/utils/budget/currencyFormatter';
import { sumArray } from '@/utils/wizard/wizardHelpers';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';


const LedgerRow: React.FC<{ label: string; value: string | number | null }> = ({ label, value }) =>
  value == null                    
    ? null
    : (
      <li className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-y-1 py-2 border-b border-slate-700/50">
        <span className="text-white/70 truncate">{label}</span>
        <span className="font-mono font-semibold text-white sm:text-right">
          {typeof value === "number" ? formatCurrency(value) : value}
        </span>
      </li>
    );


    const DetailedLedger: React.FC = () => {
        const [isOpen, setIsOpen] = useState(false);
        const { income, expenditure, savings, debts } = useWizardDataStore((s) => s.data);

        // We can reuse the detailed breakdown logic from our "wise scrolls"
        const expenditureBreakdown = useMemo(() => {
            // This is a simplified version; you can use the more complex one from your reference file
            return [
                { label: 'Boende', value: sumArray([expenditure.rent?.monthlyRent, expenditure.rent?.monthlyFee, /* etc. */]) },
                { label: 'Transport', value: sumArray([expenditure.transport?.monthlyFuelCost, /* etc. */]) },
                { label: 'Mat', value: sumArray([expenditure.food?.foodStoreExpenses, expenditure.food?.takeoutExpenses]) },
                { label: 'Fasta Utgifter', value: sumArray([expenditure.fixedExpenses?.insurance, expenditure.fixedExpenses?.electricity, /* etc. */]) },
                { label: 'Rörliga Utgifter', value: sumArray([expenditure.clothing?.monthlyClothingCost, expenditure.subscriptions?.netflix, /* etc. */]) }
            ].filter(item => item.value > 0);
    }, [expenditure]);

    return (
        <div className="text-center">
            {/* The button to reveal the magic */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-2 text-darkLimeGreen font-semibold hover:text-lime-300 transition-colors"
            >
                {isOpen ? 'Dölj detaljerad summering' : 'Visa fullständig detaljsummering'}
                <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* The collapsible content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-left mt-6 overflow-hidden"
                    >
                        <Accordion type="multiple" className="space-y-4">
                            {/* Income Details */}
                            <AccordionItem value="income" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Inkomster</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        <LedgerRow label="Nettolön" value={income.netSalary ?? 0} />
                                        <LedgerRow label="Extrainkomster" value={income.extraIncome} />
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Expenditure Details */}
                            <AccordionItem value="expenditure" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Utgifter</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        {expenditureBreakdown.map(item => <LedgerRow key={item.label} label={item.label} value={item.value} />)}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                            
                            {/* Savings Details */}
                            <AccordionItem value="savings" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Sparande</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        <LedgerRow label="Månadssparande (vana)" value={savings.habits?.monthlySavings ?? null} />
                                        {savings.goals?.map(goal => (
                                            <LedgerRow key={goal.id} label={goal.name ?? 'Namnlöst mål'} value={`Mål: ${formatCurrency(goal.targetAmount)}`} />
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>

                            {/* Debts Details */}
                            <AccordionItem value="debts" className="bg-slate-800/50 rounded-xl border-none">
                                <AccordionTrigger className="px-6 font-bold text-white">Skulder</AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <ul>
                                        {debts.debts?.map(debt => (
                                            <LedgerRow key={debt.id} label={debt.name ?? 'Namnlös skuld'} value={`${formatCurrency(debt.balance)} @ ${debt.apr}%`} />
                                        ))}
                                    </ul>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DetailedLedger;