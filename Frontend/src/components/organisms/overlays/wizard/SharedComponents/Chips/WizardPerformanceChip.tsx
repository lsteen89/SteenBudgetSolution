import type { PerformanceMode } from "@/hooks/usePerformanceMode";
import clsx from "clsx";

type Props = {
  mode: PerformanceMode;
  override: PerformanceMode | null;
  onToggle: () => void;
  onClearOverride: () => void;
};

export function WizardPerformanceChip({
  mode,
  override,
  onToggle,
  onClearOverride,
}: Props) {
  const checked = mode === "low";
  const isAuto = override === null;

  return (
    <div className="flex items-center gap-2 rounded-full border border-wizard-stroke/25 bg-wizard-surface/30 px-2.5 py-1 md:px-3">
      <span className="text-xs font-semibold text-wizard-text">sparläge</span>
      <span className="hidden lg:inline text-[11px] text-wizard-text/55">
        <span className="text-wizard-text/80">
          {isAuto ? "Auto" : "Manuell"}
        </span>
      </span>

      {!isAuto && (
        <button
          type="button"
          onClick={onClearOverride}
          className="text-[11px] underline underline-offset-2 text-wizard-text/55 hover:text-wizard-text/80"
        >
          återställ
        </button>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={clsx(
          "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full border p-0.5 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/60 focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-shell",
          checked
            ? "border-darkLimeGreen/70 bg-darkLimeGreen/60"
            : "border-wizard-stroke/40 bg-wizard-shell/60",
        )}
      >
        <span
          className={clsx(
            "h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-full" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}
