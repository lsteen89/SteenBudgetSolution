import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { sumArray } from '@/utils/wizard/wizardHelpers';

interface Slice {
  name: string;
  value: number;
}

interface SavingsDonutChartProps {
  slices: Slice[];
}

const COLORS = ['#32CD32', '#CCE5FF', '#001F3F', '#98FF98', '#88a4d4'];

const SavingsDonutChart: React.FC<SavingsDonutChartProps> = ({ slices }) => {
  const total = sumArray(slices.map((s) => s.value));
  if (!total) return null;

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          innerRadius="60%"
          outerRadius="85%"
          paddingAngle={2}
        >
          {slices.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} className="cursor-pointer" />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toLocaleString('sv-SE')} kr`} />
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          className="text-lg font-bold fill-white"
        >
          Ditt Sparande
        </text>
      </PieChart>
    </ResponsiveContainer>
  );
};

export default SavingsDonutChart;
