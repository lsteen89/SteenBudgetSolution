import React, { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { lighten } from "@utils/wizard/wizardHelpers";

export interface InnerSlice { name: string; value: number }
export interface OuterSlice { name: string; value: number; parentIdx: number }

interface Props {
  inner: InnerSlice[];
  outer: OuterSlice[];
}

const BASE = ["#32CD32", "#CCE5FF", "#001F3F", "#98FF98", "#dbeafe"];

const NestedDonut: React.FC<Props> = ({ inner, outer }) => {
  const [activeO, setActiveO] = useState<number | null>(null);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        {/* inner ring (top-level) */}
        <Pie
          data={inner}
          dataKey="value"
          outerRadius="45%"
          innerRadius="25%"
          stroke="none"
          isAnimationActive
        >
          {inner.map((_, i) => (
            <Cell key={i} fill={BASE[i % BASE.length]} />
          ))}
        </Pie>

        {/* outer ring (sub-categories) */}
        <Pie
          data={outer}
          dataKey="value"
          innerRadius="50%"
          outerRadius="80%"
          paddingAngle={1}
          activeIndex={activeO ?? undefined}
          onMouseEnter={(_, idx) => setActiveO(idx)}
          onMouseLeave={() => setActiveO(null)}
          isAnimationActive
        >
          {outer.map((o, i) => (
            <Cell
              key={i}
              fill={lighten(BASE[o.parentIdx % BASE.length], 0.4)}
            />
          ))}
        </Pie>

        <Tooltip
          formatter={(v: number) => `${v.toLocaleString("sv-SE")} kr`}
          separator=": "
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default NestedDonut;
