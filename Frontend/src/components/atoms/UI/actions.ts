import { cn } from "@/lib/utils";

type ActionVariant = "primary" | "secondary" | "ghost";
type ActionSize = "md" | "sm" | "xs";

const base =
    "inline-flex items-center justify-center rounded-2xl " +
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/35 " +
    "disabled:opacity-50 disabled:pointer-events-none " +
    "transition-colors duration-150";

const variants: Record<ActionVariant, string> = {
    primary: cn(
        "font-semibold",
        "bg-eb-accent text-white shadow-[0_14px_28px_rgba(34,197,94,0.18)]",
        "hover:brightness-[0.98] active:brightness-[0.95]"
    ),
    secondary: cn(
        "font-semibold",
        "bg-eb-surface/75 border border-eb-stroke/30 text-eb-text/80",
        "hover:bg-eb-surfaceAccent/60 hover:text-eb-text"
    ),
    ghost: cn(
        "bg-transparent text-eb-text",
        "hover:bg-eb-surfaceAccent/40 hover:text-eb-text"
    ),
};

const sizes = {
    md: "h-11 px-5",
    sm: "h-10 px-4",
    xs: "px-2 py-1",
} as const;

export function actionClass(opts?: { variant?: ActionVariant; size?: ActionSize; className?: string }) {
    const { variant = "secondary", size = "md", className } = opts ?? {};
    return cn(base, variants[variant], sizes[size], className);
}
