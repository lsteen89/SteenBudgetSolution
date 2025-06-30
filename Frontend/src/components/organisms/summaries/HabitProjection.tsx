import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { calculateFutureValue } from "@/utils/budget/financialCalculations";
import formatCurrency from "@/utils/budget/currencyFormatter";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface HabitProjectionProps {
  monthlySavings: number;
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
const HabitProjection: React.FC<HabitProjectionProps> = ({ monthlySavings }) => {
  const prefersReduced = useReducedMotion();
  const projectionYears = [1, 5, 10, 20];

  const chartData = useMemo(
    () =>
      projectionYears.map((year) => ({
        year: `${year}y`,
        "Sparat": monthlySavings * 12 * year,
        "Ränta på ränta": calculateFutureValue(monthlySavings, year),
      })),
    [monthlySavings]
  );

  return (
    <motion.div
      initial={prefersReduced ? undefined : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="text-center p-6 bg-gray-800/30 rounded-2xl max-w-xl mx-auto"
    >
      <h4 className="text-xl font-bold text-lime-400 mb-2">Skörden av ditt sparande</h4>
      <p className="text-white/80">
        Du lägger undan <strong className="text-white text-lg">{formatCurrency(monthlySavings)}</strong> varje månad.
      </p>
      <p className="mt-1 text-sm text-white/70 mb-4">
        Se hur ditt sparande ökaröver tid – och hur ränta på ränta (4 %) accelererar det.
      </p>

      {/* Compact dual‑bar chart */}
      <div style={{ width: "100%", height: 220 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            barCategoryGap="20%"
          >
            <XAxis dataKey="year" stroke="#9ca3af" fontSize={12} />
            <YAxis
              stroke="#9ca3af"
              fontSize={12}
              tickFormatter={(v) => `${v / 1000}k`}
            />
            <Tooltip
              contentStyle={{ background: "#1f2937", borderRadius: "0.5rem" }}
              formatter={(v: number) => formatCurrency(v)}
            />
            <Legend
              wrapperStyle={{ fontSize: "0.75rem" }}
              iconType="circle"
            />
            {/* Base savings */}
            <Bar
              dataKey="Sparat"
              fill="#6b7280"
              animationDuration={prefersReduced ? 0 : 800}
            />
            {/* Compounded overlay */}
            <Bar
              dataKey="Ränta på ränta"
              fill="#84cc16"
              animationDuration={prefersReduced ? 0 : 800}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default HabitProjection;
