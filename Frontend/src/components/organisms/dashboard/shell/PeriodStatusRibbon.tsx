import { ArrowRight, BarChart3, CircleDot, Lock, SkipForward } from "lucide-react";

import { cn } from "@/lib/utils";

export type PeriodRibbonTone = "neutral" | "success" | "attention" | "muted";
export type PeriodRibbonIcon = "status" | "lock" | "compare" | "next" | "skip";

export type PeriodStatusRibbonItem = {
  label: string;
  tone: PeriodRibbonTone;
  icon: PeriodRibbonIcon;
};

type PeriodStatusRibbonProps = {
  items: PeriodStatusRibbonItem[];
};

const toneClass: Record<PeriodRibbonTone, string> = {
  neutral: "text-[rgb(21_39_81_/_0.58)]",
  success: "text-emerald-700",
  attention: "text-amber-700",
  muted: "text-[rgb(21_39_81_/_0.5)]",
};

const iconClass: Record<PeriodRibbonTone, string> = {
  neutral: "text-[rgb(21_39_81_/_0.42)]",
  success: "text-emerald-600",
  attention: "text-amber-600",
  muted: "text-[rgb(21_39_81_/_0.36)]",
};

function PeriodRibbonIcon({
  icon,
  tone,
}: {
  icon: PeriodRibbonIcon;
  tone: PeriodRibbonTone;
}) {
  const className = cn("h-3.5 w-3.5 shrink-0", iconClass[tone]);

  if (icon === "lock") return <Lock className={className} />;
  if (icon === "compare") return <BarChart3 className={className} />;
  if (icon === "next") return <ArrowRight className={className} />;
  if (icon === "skip") return <SkipForward className={className} />;
  return <CircleDot className={className} />;
}

export default function PeriodStatusRibbon({
  items,
}: PeriodStatusRibbonProps) {
  if (items.length === 0) return null;

  return (
    <div
      data-testid="period-status-ribbon"
      className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[rgb(199_228_255_/_0.35)] pt-3"
    >
      {items.map((item) => (
        <div
          key={`${item.icon}-${item.label}`}
          className={cn(
            "flex items-center gap-2 text-xs font-medium leading-5",
            toneClass[item.tone],
          )}
        >
          <PeriodRibbonIcon icon={item.icon} tone={item.tone} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
