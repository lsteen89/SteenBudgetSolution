import React from "react";
import { motion } from "framer-motion";
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";
import { SavingsGoal } from "@/types/Wizard/SavingsFormValues";
import { IncomeFormValues } from "@/types/Wizard/IncomeFormValues";
import { calcMonthlyIncome } from "@/utils/wizard/wizardHelpers";
import { calculateMonthlyContribution } from "@/utils/budget/financialCalculations";
import formatCurrency from "@/utils/budget/currencyFormatter";
import { QuickenPaceSlider } from "@/components/molecules/controls/QuickenPaceSlider";

interface GoalSummaryProps {
  goals: SavingsGoal[];
  income: Partial<IncomeFormValues>;
}

export const GoalSummary: React.FC<GoalSummaryProps> = ({ goals, income }) => {
  const totalMonthlyIncome = calcMonthlyIncome(income);

  // --------------------- no‑goal state ---------------------
  if (goals.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-2xl mx-auto p-6 bg-gray-800/50 rounded-2xl text-center"
      >
        <h5 className="font-bold text-lg text-white">"Tänk om.. tänk om man kunde spara bara lite?"</h5>
        <p className="text-sm text-white/70 mt-2">
          Du har ännu inte påbörjat din resa mot ekonomisk frihet. Men kolla på det här! Med bara en liten del av din inkomst kan du börja bygga din framtida rikedom och trygghet!
        </p>
        <div className="mt-4 pt-4 border-t border-gray-600/50">
          {[0.01, 0.03, 0.05].map((p) => {
            const monthlySaving = totalMonthlyIncome * p;
            return (
              <p key={p} className="text-sm my-1">
                Om du bara sparar <strong className="text-white">{p * 100}%</strong> av din inkomst ({formatCurrency(monthlySaving)}/m) så sparar du <strong className="text-lime-300">{formatCurrency(monthlySaving * 12)}</strong> på bara ett år!
              </p>
            );
          })}
        </div>
        <p className="text-xs text-white/50 mt-6">
          Glöm inte, du kan alltid lägga till mål senare när du är redo. Varje liten bit räknas!
        </p>
      </motion.div>
    );
  }

  // --------------------- goals present ---------------------
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <h4 className="text-xl font-bold text-lime-400 text-center">Din karta mot rikedom</h4>
      <p className="text-center text-xs text-white/60 mb-1">Tryck på ett mål för att se detaljer &amp; speed boosters</p>

      <Accordion type="multiple" className="space-y-3">
        {goals.map((goal) => {
          if (!goal.targetAmount || !goal.targetDate) return null;

          const progress = Math.round(((goal.amountSaved ?? 0) / goal.targetAmount) * 100);
          const chartData = [{ name: "progress", value: progress, fill: "#84cc16" }];
          const currentMonthly = calculateMonthlyContribution(goal.targetAmount, goal.amountSaved, new Date(goal.targetDate!));

          return (
            <AccordionItem key={goal.id} value={goal.id ?? goal.name} className="bg-gray-800/50 rounded-2xl shadow-md overflow-hidden">

              {/* Trigger with custom chevron; built‑in svg hidden */}
              <AccordionTrigger
                className="group w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-800/70 focus:outline-none transition-colors [&>svg:last-child]:hidden"
              >
                {/* Progress ring */}
                <div className="w-16 h-16 flex-shrink-0 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="75%" outerRadius="100%" barSize={8} data={chartData} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar background={{ fill: "#374151" }} dataKey="value" cornerRadius={10} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-sm font-bold text-white">{progress}%</span>
                  </div>
                </div>

                {/* Short info */}
                <div className="flex-grow pr-2">
                  <p className="text-white font-semibold leading-tight truncate">{goal.name}</p>
                  <p className="text-xs text-white/70">{formatCurrency(goal.amountSaved)} / {formatCurrency(goal.targetAmount)}</p>
                </div>

                {/* Custom chevron icon */}
                <ChevronDown className="h-5 w-5 flex-shrink-0 text-lime-400 transition-transform duration-300 group-data-[state=open]:rotate-180" />
              </AccordionTrigger>

              {/* Content */}
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-white/70">
                  Mål: {formatCurrency(goal.targetAmount)} · Än så länge: {formatCurrency(goal.amountSaved)}
                </p>
                <p className="text-sm text-lime-300/80 mb-2">Behöver ≈ {formatCurrency(currentMonthly)}/m</p>

                <QuickenPaceSlider
                  goalId={goal.id!}
                  targetAmount={goal.targetAmount!}
                  amountSaved={goal.amountSaved ?? 0}
                  currentMonthly={currentMonthly}
                  totalMonthlyIncome={totalMonthlyIncome}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default GoalSummary;
