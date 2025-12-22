import React, { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { calculateFutureValue } from "@/utils/budget/financialCalculations";
import formatCurrency from "@/utils/money/currencyFormatter";

interface PotentialAnalysisProps {
  generalSavings: number;
}

export const PotentialAnalysis: React.FC<PotentialAnalysisProps> = ({ generalSavings }) => {
  if (generalSavings <= 0) return null;

  const shouldReduce = useReducedMotion();

  const chartData = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => {
      const year = i + 1; // start at year 1
      return {
        year: `${year}y`,
        "Utan ränta på ränta": generalSavings * 12 * year,
        "Med ränta på ränta": calculateFutureValue(generalSavings, year),
      };
    });
  }, [generalSavings]);

  return (
    <motion.div
      initial={shouldReduce ? false : { opacity: 0 }}
      animate={shouldReduce ? false : { opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="text-center max-w-2xl mx-auto"
    >
      <div className="mt-8 p-6 bg-gray-800/50 rounded-2xl shadow-lg">
        <h4 className="text-xl font-bold text-lime-400 mb-2">
          Det stigande berget av rikedom
        </h4>
        <p className="text-xs text-white/60 mb-4 max-w-lg mx-auto">
          Detta diagrammet berättar två saker. Det <span className="text-gray-400 font-semibold">gråa berget</span> är det sparande över tid. Den ljusare <span className="text-lime-400 font-semibold">gröna linjen</span> är samma topp fast med magi! (4 % årlig ränta på ränta).
        </p>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMagic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#84cc16" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#84cc16" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorHoard" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" stroke="#9ca3af" fontSize={12} />
              <YAxis
                stroke="#9ca3af"
                fontSize={12}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${v / 1_000_000} M` : `${v / 1000} k`
                }
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#1f2937", borderRadius: "0.5rem" }}
                formatter={(v: number) => formatCurrency(v)}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: "0.75rem" }} />
              <Area
                type="monotone"
                dataKey="Utan ränta på ränta"
                stroke="#9ca3af"
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorHoard)"
                isAnimationActive={!shouldReduce}
              />
              <Area
                type="monotone"
                dataKey="Med ränta på ränta"
                stroke="#84cc16"
                fillOpacity={1}
                fill="url(#colorMagic)"
                isAnimationActive={!shouldReduce}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default PotentialAnalysis;
