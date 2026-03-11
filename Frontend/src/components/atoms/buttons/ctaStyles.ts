import { cn } from "@/lib/utils";

export const ctaBaseClass = cn(
  "h-11 px-5 rounded-2xl font-semibold",
  "inline-flex items-center justify-center gap-2",
  "bg-eb-accent text-white",
  "shadow-[0_14px_28px_rgba(34,197,94,0.18)]",
  "transition-[transform,filter,box-shadow] duration-150",
  "hover:-translate-y-[1px] hover:brightness-[0.99] hover:shadow-[0_18px_36px_rgba(34,197,94,0.22)]",
  "active:translate-y-0 active:brightness-[0.96]",
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/35",
  "disabled:opacity-50 disabled:pointer-events-none",
  "motion-reduce:transform-none",
);

export const secondaryActionClass = cn(
  "h-11 px-5 rounded-2xl font-semibold",
  "inline-flex items-center justify-center gap-2",
  "bg-eb-surface/75 border border-eb-stroke/30 text-eb-text/80",

  // subtle depth baseline
  "shadow-[0_10px_22px_rgba(21,39,81,0.08)]",

  // same “pressable” feel as CTA, but calmer
  "transition-[transform,box-shadow,background-color,color] duration-150",
  "hover:-translate-y-[1px] hover:bg-eb-surfaceAccent/60 hover:text-eb-text hover:shadow-[0_14px_28px_rgba(21,39,81,0.10)]",
  "active:translate-y-0 active:shadow-[0_8px_18px_rgba(21,39,81,0.08)]",

  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/35",
  "disabled:opacity-50 disabled:pointer-events-none",
  "motion-reduce:transform-none",
);
