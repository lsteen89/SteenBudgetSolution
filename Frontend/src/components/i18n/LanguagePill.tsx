import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { AppLocale } from "@/types/i18n/appLocale";
import { setAppLocale } from "@/utils/i18n/appLocaleStore";
import { Check } from "lucide-react";
import * as React from "react";

type Option = { value: AppLocale; label: string; short: string };

const OPTIONS: Option[] = [
  { value: "sv-SE", label: "Svenska", short: "SV" },
  { value: "en-US", label: "English", short: "EN" },
  { value: "et-EE", label: "Eesti", short: "ET" },
];

export function LanguagePill({
  className,
  align = "right",
  fullWidth = false,
}: {
  className?: string;
  align?: "left" | "right";
  fullWidth?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const locale = useAppLocale();
  const current = OPTIONS.find((o) => o.value === locale) ?? OPTIONS[0];

  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onDown(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "h-11 rounded-2xl font-semibold",
          fullWidth ? "w-full px-4 justify-between" : "px-3",
          "inline-flex items-center gap-2",
          "bg-eb-surface/75 border border-eb-stroke/30 backdrop-blur-md",
          "text-eb-text/80 hover:text-eb-text hover:bg-eb-surfaceAccent/60",
          "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/40",
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <span className="text-sm">{current.short}</span>
          <span className={cn(fullWidth && "text-sm text-eb-text/60")}>
            {fullWidth ? current.label : null}
          </span>
        </span>

        <span className="text-eb-text/50">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute mt-2 w-52 overflow-hidden rounded-2xl",
            align === "right" ? "right-0" : "left-0",
            "bg-eb-surface/95 backdrop-blur-md",
            "border border-eb-stroke/30",
            "shadow-[0_18px_50px_rgba(21,39,81,0.12)]",
          )}
        >
          {OPTIONS.map((o) => {
            const active = o.value === locale;
            return (
              <button
                key={o.value}
                role="menuitem"
                type="button"
                onClick={() => {
                  setAppLocale(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full px-3 py-2.5 text-left text-sm",
                  "inline-flex items-center justify-between",
                  "hover:bg-eb-surfaceAccent/60",
                  active ? "text-eb-text font-semibold" : "text-eb-text/80",
                )}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-8 text-eb-text/60">{o.short}</span>
                  <span>{o.label}</span>
                </span>
                {active ? <Check className="h-4 w-4 text-eb-accent" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
