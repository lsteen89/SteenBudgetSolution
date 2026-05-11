import React from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { editScopeToggleDict } from "@/utils/i18n/components/editScope/EditScopeToggle.i18n";
import { tDict } from "@/utils/i18n/translate";

/**
 * Possible scopes for any money-domain edit (expense, income, savings, debt).
 *
 *  - `month`: applies only to the currently open budget month.
 *  - `plan` : updates the recurring plan from next month forward.
 *
 * Map to the backend `updateDefault` flag at the call site:
 *   month → updateDefault: false
 *   plan  → updateDefault: true
 */
export type EditScope = "month" | "plan";

export type EditScopeToggleProps = {
  /** Currently selected scope. */
  value: EditScope;
  /** Called when the user picks a different scope. */
  onChange: (next: EditScope) => void;
  /**
   * Localized label for the current month, e.g. "april 2026".
   * Substituted into the "{month}" placeholder in the option label.
   */
  monthLabel: string;
  /**
   * If false, the "Update the ongoing budget plan" option is disabled with a
   * helper hint. Use this when a row is month-only (no baseline to update).
   */
  canUpdatePlan?: boolean;
  /**
   * Optional override hint shown under the disabled "plan" option, e.g.
   * "Det här är en engångskostnad – det finns ingen plan att uppdatera."
   */
  disabledPlanHint?: string;
  /** Disable the entire control (e.g. read-only / saving). */
  disabled?: boolean;
  /** Optional accessible legend override; defaults to localized copy. */
  legend?: string;
  className?: string;
  testId?: string;
};

/**
 * Two-option toggle that exposes the only-this-month vs going-forward
 * distinction every money-edit flow must surface. Reusable across all four
 * domains. User-facing copy intentionally avoids "default" / "baseline".
 */
export const EditScopeToggle: React.FC<EditScopeToggleProps> = ({
  value,
  onChange,
  monthLabel,
  canUpdatePlan = true,
  disabledPlanHint,
  disabled = false,
  legend,
  className,
  testId,
}) => {
  const locale = useAppLocale();
  const t = <K extends keyof typeof editScopeToggleDict.sv>(key: K) =>
    tDict(key, locale, editScopeToggleDict);

  const monthOptionLabel = t("onlyThisMonth").replace("{month}", monthLabel);
  const planOptionDisabled = disabled || !canUpdatePlan;

  // If the plan option becomes unreachable while it was selected, normalize
  // the visible state back to "month" so the parent never displays a stale
  // selection. The parent stays the source of truth via `value`/`onChange`.
  React.useEffect(() => {
    if (!canUpdatePlan && value === "plan") {
      onChange("month");
    }
  }, [canUpdatePlan, value, onChange]);

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div
        id={testId ? `${testId}-legend` : undefined}
        className="text-xs font-bold uppercase tracking-wide text-eb-text/55"
      >
        {legend ?? t("legend")}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={testId ? `${testId}-legend` : undefined}
        aria-label={legend ?? t("legend")}
        className="grid gap-1 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.42)] p-1 sm:grid-cols-2"
      >
        <ScopeOption
          selected={value === "month"}
          disabled={disabled}
          onSelect={() => onChange("month")}
          label={monthOptionLabel}
          help={t("onlyThisMonthHelp")}
          testId={testId ? `${testId}-month` : undefined}
        />
        <ScopeOption
          selected={value === "plan"}
          disabled={planOptionDisabled}
          onSelect={() => onChange("plan")}
          label={t("updatePlanForward")}
          help={
            !canUpdatePlan && disabledPlanHint
              ? disabledPlanHint
              : t("updatePlanForwardHelp")
          }
          testId={testId ? `${testId}-plan` : undefined}
        />
      </div>
    </div>
  );
};

type ScopeOptionProps = {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  label: string;
  help: string;
  testId?: string;
};

const ScopeOption: React.FC<ScopeOptionProps> = ({
  selected,
  disabled,
  onSelect,
  label,
  help,
  testId,
}) => (
  <button
    type="button"
    role="radio"
    aria-checked={selected}
    aria-disabled={disabled || undefined}
    disabled={disabled}
    onClick={onSelect}
    data-testid={testId}
    className={cn(
      "flex flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-left transition",
      "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
      "disabled:cursor-not-allowed disabled:opacity-60",
      selected
        ? "bg-white text-eb-text shadow-sm ring-1 ring-eb-stroke/30"
        : "text-eb-text/65 hover:bg-white/70",
    )}
  >
    <span className="text-sm font-extrabold leading-tight">{label}</span>
    <span className="text-[11px] font-medium leading-snug text-eb-text/55">
      {help}
    </span>
  </button>
);

export default EditScopeToggle;
