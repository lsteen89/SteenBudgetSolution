import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { PerformanceMode } from "@/hooks/usePerformanceMode";
import { tDict } from "@/utils/i18n/translate";
import { wizardPerformanceDict } from "@/utils/i18n/wizard/components/WizardPerformanceToggle";
import clsx from "clsx";
import * as React from "react";

type Props = {
  mode: PerformanceMode; // effective
  override: PerformanceMode | null; // user choice
  onSetLow: () => void;
  onSetNormal: () => void;
  onClearOverride: () => void;
};

export function WizardPerformanceToggle({
  mode,
  override,
  onSetLow,
  onSetNormal,
  onClearOverride,
}: Props) {
  const id = React.useId();
  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardPerformanceDict.sv>(k: K) =>
    tDict(k, locale, wizardPerformanceDict);

  const checked = mode === "low";
  const isAuto = override === null;

  return (
    <div className="mb-2 rounded-2xl border border-wizard-stroke/25 bg-wizard-surface/40 p-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div id={id} className="text-sm font-semibold text-wizard-text">
            {t("title")}
          </div>
          <p className="mt-1 text-xs text-wizard-text/70">{t("description")}</p>

          {/* optional: tiny “state” line, helps users understand */}
          <div className="mt-2 text-[11px] text-wizard-text/55">
            {isAuto ? "Auto" : "Manuell"} •{" "}
            <span className="text-wizard-text/80">
              {checked ? t("on") : t("off")}
            </span>
            {!isAuto && (
              <button
                type="button"
                onClick={onClearOverride}
                className="ml-2 underline underline-offset-2 hover:text-wizard-text/80"
              >
                {t("reset")}
              </button>
            )}
          </div>
        </div>

        {/* control column */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-labelledby={id}
            onClick={checked ? onSetNormal : onSetLow}
            className={clsx(
              "relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/60 focus-visible:ring-offset-2 focus-visible:ring-offset-wizard-shell",
              "motion-reduce:transition-none",
              checked
                ? "border-darkLimeGreen/70 bg-darkLimeGreen/60"
                : "border-wizard-stroke/40 bg-wizard-shell/70",
            )}
          >
            <span
              className={clsx(
                "h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                "motion-reduce:transition-none",
                checked ? "translate-x-full" : "translate-x-0",
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
