import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import formatCurrency from "@/utils/money/currencyFormatter";
import { calculateMonthsToGoal } from "@/utils/budget/financialCalculations";

export interface QuickenPaceSliderProps {
  goalId: string;
  targetAmount: number;
  amountSaved: number;
  currentMonthly: number;
  totalMonthlyIncome: number;
}

export const QuickenPaceSlider: React.FC<QuickenPaceSliderProps> = ({
  goalId,
  targetAmount,
  amountSaved,
  currentMonthly,
  totalMonthlyIncome,
}) => {
  const [extraSavings, setExtraSavings] = useState(0);

  const { currentTimeline, newTimeline, timelinePct, pctOfIncome } =
    useMemo(() => {
      const currentTimeline = calculateMonthsToGoal(
        targetAmount,
        amountSaved,
        currentMonthly
      );
      const newMonthly = currentMonthly + extraSavings;
      const newTimeline = calculateMonthsToGoal(
        targetAmount,
        amountSaved,
        newMonthly
      );
      const timelinePct =
        isFinite(currentTimeline) && currentTimeline > 0
          ? (newTimeline / currentTimeline) * 100
          : 100;
      const pctOfIncome =
        totalMonthlyIncome > 0
          ? Math.round((extraSavings / totalMonthlyIncome) * 100)
          : 0;

      return { currentTimeline, newTimeline, timelinePct, pctOfIncome };
    }, [extraSavings, targetAmount, amountSaved, currentMonthly, totalMonthlyIncome]);

  return (
    <div className="mt-4 pt-4 border-t border-gray-600/50">
      <h6 className="font-semibold text-lime-300">Öka takten!</h6>
      <p className="text-xs text-white/60 mb-2">
        Flytta reglaget för att se hur mycket snabbare du kan nå ditt mål med lite extra sparande varje månad:
      </p>

      {/* Slider */}
      <div className="flex items-center gap-4 my-2">
        <input
          id={`extra-savings-slider-${goalId}`}
          type="range"
          min={0}
          max={Math.min(
            targetAmount - amountSaved,
            totalMonthlyIncome * 0.3,
            10_000
          )}
          step={100}
          value={extraSavings}
          aria-label="Adjust extra monthly savings"
          onChange={(e) => setExtraSavings(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-lime-400"
        />
        <span className="font-bold text-white w-24 text-center">
          {formatCurrency(extraSavings)}
        </span>
      </div>

      {/* Timeline bar */}
      <div
        className="h-6 w-full bg-gray-900/50 rounded-full mt-3 p-1"
        title={`Original timeline: ~${currentTimeline} months`}
      >
        <motion.div
          className="h-full bg-lime-500 rounded-full"
          initial={{ width: "100%" }}
          animate={{ width: `${timelinePct}%` }}
          transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
        />
      </div>

      <p className="text-sm text-center mt-2">
        Ny tidslinje: ~
        <strong className="text-lime-300">
          {newTimeline === Infinity ? "∞" : Math.round(newTimeline)} månader
        </strong>
        {extraSavings > 0 && (
          <span className="text-white/70 text-xs">
            {" "}
            (Med {pctOfIncome}% av din totala inkomst)
          </span>
        )}
      </p>
    </div>
  );
};
