import React from "react";
import { Mountain, Footprints, CircleSlash } from "lucide-react";

interface Props {
  selected: boolean;
  title: string;
  icon: "mountain" | "footsteps" | "none";
  subtitle: string;
  firstTarget: string;
  onSelect: () => void;
}

const icons = {
  mountain: <Mountain className="h-8 w-8 text-darkLimeGreen" />,
  footsteps: <Footprints className="h-8 w-8 text-darkLimeGreen" />,
  none: <CircleSlash className="h-8 w-8 text-darkLimeGreen" />,
};

const PathCard: React.FC<Props> = ({
  selected,
  icon,
  title,
  subtitle,
  firstTarget,
  onSelect,
}) => (
  <button
    role="button"
    onClick={onSelect}
    type="button"
    className={`rounded-2xl border p-6 text-left transition hover:scale-[1.02] h-full flex flex-col ${
      selected ? "border-darkLimeGreen bg-slate-800/40" : "border-white/10 bg-slate-700/30"
    }`}
  >
    {icons[icon]}
    <h4 className="mt-3 text-lg font-semibold text-white">{title}</h4>
    <p className="mt-1 text-sm text-white/70 flex-grow">{subtitle}</p> 
    

    <div className="mt-3 border-t border-white/10 pt-3 text-xs">
      {icon === 'none' ? (
        // If the icon is 'none', render text without the "Första fokus:" prefix
        <p className="text-white/50">{firstTarget}</p>
      ) : (
        // Otherwise, render it with the prefix
        <p className="text-white/50">
          Första fokus: <span className="font-medium text-white">{firstTarget}</span>
        </p>
      )}
    </div>

  </button>
);

export default PathCard;