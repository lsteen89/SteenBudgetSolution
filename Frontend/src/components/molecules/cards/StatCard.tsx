import React from "react";

interface Props {
  label: string;
  value: string | number;
  suffix?: string;
}

const StatCard: React.FC<Props> = ({ label, value, suffix }) => (
  <div className="rounded-2xl bg-slate-800/60 p-4 text-center shadow">
    <p className="text-xs uppercase tracking-wide text-white/60">{label}</p>
    <p className="mt-1 text-2xl font-bold text-darkLimeGreen">
      {value} {suffix}
    </p>
  </div>
);
export default StatCard;