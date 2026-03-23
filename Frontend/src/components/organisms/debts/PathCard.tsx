import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { tDict } from "@/utils/i18n/translate";
import { CheckCircle2, CircleSlash, Footprints, Mountain } from "lucide-react";

const pathCardDict = {
  sv: {
    suggests: "Föreslår:",
  },
  en: {
    suggests: "Suggests:",
  },
  et: {
    suggests: "Soovitab:",
  },
} as const;

interface Props {
  selected: boolean;
  title: string;
  icon: "mountain" | "footsteps" | "none";
  heroOutcome?: string;
  heroDetail?: string;
  subtitle: string;
  targetChip?: string;
  tip?: string;
  onSelect: () => void;

  // legacy
  firstTarget?: string;
}

const iconCls = "h-8 w-8";

const Icons = {
  mountain: <Mountain className={cn(iconCls, "text-wizard-accent")} />,
  footsteps: <Footprints className={cn(iconCls, "text-wizard-accent")} />,
  none: <CircleSlash className={cn(iconCls, "text-wizard-text/45")} />,
};

export default function PathCard({
  selected,
  icon,
  title,
  heroOutcome,
  heroDetail,
  subtitle,
  targetChip,
  tip,
  onSelect,
}: Props) {
  const locale = useAppLocale();

  const t = <K extends keyof typeof pathCardDict.sv>(k: K) =>
    tDict(k, locale, pathCardDict);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative w-full text-left transition",
        "rounded-3xl overflow-hidden",
        "border shadow-[0_10px_30px_rgba(2,6,23,0.10)]",
        "backdrop-blur-[2px]",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35",
        selected
          ? "bg-wizard-shell/75 border-wizard-stroke/55 ring-1 ring-wizard-stroke/35"
          : "bg-wizard-shell/65 border-wizard-stroke/30 hover:border-wizard-stroke/45 hover:bg-wizard-shell/75",
        "active:translate-y-[1px]",
      )}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(to_right,rgba(255,255,255,0.55),rgba(255,255,255,0.18),rgba(255,255,255,0))]"
      />

      {selected && (
        <div className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-wizard-surface border border-wizard-stroke/25 shadow-sm">
          <CheckCircle2 className="h-5 w-5 text-wizard-accent" />
        </div>
      )}

      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={cn(
              "grid h-12 w-12 place-items-center rounded-2xl",
              "bg-wizard-surface border border-wizard-stroke/20",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]",
            )}
          >
            {Icons[icon]}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="text-base sm:text-lg font-semibold text-wizard-text truncate">
              {title}
            </h4>

            {heroOutcome && (
              <p className="mt-1 text-sm sm:text-base font-semibold text-wizard-text/90">
                {heroOutcome}
              </p>
            )}

            {heroDetail && (
              <p className="mt-1 font-mono text-sm tabular-nums text-wizard-text/75">
                {heroDetail}
              </p>
            )}

            <p className="mt-2 text-sm text-wizard-text/65">{subtitle}</p>
          </div>
        </div>

        {targetChip && icon !== "none" && (
          <div className="mt-4 pt-4 border-t border-wizard-stroke/20">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1",
                "bg-wizard-surface border border-wizard-stroke/20",
                "text-xs font-semibold text-wizard-text/65",
              )}
            >
              {t("suggests")}
              <span className="ml-1 text-wizard-text font-semibold">
                {targetChip}
              </span>
            </span>
          </div>
        )}

        {tip && <p className="mt-3 text-xs text-wizard-text/60">{tip}</p>}
      </div>
    </button>
  );
}
