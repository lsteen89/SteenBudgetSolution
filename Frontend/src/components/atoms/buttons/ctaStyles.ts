import { cn } from "@/lib/utils";

export const ctaBaseClass = cn(
    "h-11 px-5 rounded-2xl font-semibold",
    "inline-flex items-center justify-center",
    "bg-eb-accent text-white shadow-[0_14px_28px_rgba(34,197,94,0.18)]",
    "hover:brightness-[0.98] active:brightness-[0.95]",
    "transition-[filter] duration-150",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/35",
    "disabled:opacity-50 disabled:pointer-events-none"
);


export const secondaryActionClass = cn(
    "h-11 px-5 rounded-2xl font-semibold",
    "inline-flex items-center justify-center",
    "bg-eb-surface/75 border border-eb-stroke/30 text-eb-text/80",
    "hover:bg-eb-surfaceAccent/60 hover:text-eb-text",
    "transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/35",
    "disabled:opacity-50 disabled:pointer-events-none"
);