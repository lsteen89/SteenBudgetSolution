import { cn } from "@/lib/utils";
import type { IncomeCreateScope } from "@/types/budget/BudgetMonthsStatusDto";

/**
 * Two-card scope selector used by the income create drawer.
 *
 * Why a dedicated component instead of `EditScopeRadioCards`:
 *   - The shared edit-scope cards expose three options including
 *     `budgetPlanOnly`. The income editor deliberately does not surface a
 *     future-plan-only add flow, and the backend create validator rejects
 *     that value — so the create UI must be physically narrower than the
 *     edit UI.
 *   - The copy here is create-specific ("Lägg även till i budgetplanen
 *     framåt") rather than the edit-context ("Denna månad + planen
 *     framåt"). Sharing the wider component would force generic copy on
 *     both sides.
 *
 * Visual treatment intentionally mirrors `EditScopeRadioCards` so the
 * create and edit drawers feel like the same family. Behavior is plain:
 * radio-group semantics, controlled by `value`, no internal state. The
 * default selection (`currentMonthAndBudgetPlan`) lives in the parent
 * because the parent owns reset-on-open and submit wiring.
 */
type IncomeCreateScopeCardsProps = {
  value: IncomeCreateScope;
  onChange: (next: IncomeCreateScope) => void;
  /** Long month label, e.g. "januari 2026". */
  monthLabel: string;
  legend: string;
  currentMonthOnlyLabel: string;
  currentMonthOnlyHelp: string;
  currentMonthAndBudgetPlanLabel: string;
  currentMonthAndBudgetPlanHelp: string;
  disabled?: boolean;
  className?: string;
  testId?: string;
};

const interpolate = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

export default function IncomeCreateScopeCards({
  value,
  onChange,
  monthLabel,
  legend,
  currentMonthOnlyLabel,
  currentMonthOnlyHelp,
  currentMonthAndBudgetPlanLabel,
  currentMonthAndBudgetPlanHelp,
  disabled = false,
  className,
  testId,
}: IncomeCreateScopeCardsProps) {
  const legendId = testId ? `${testId}-legend` : undefined;

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div
        id={legendId}
        className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55"
      >
        {legend}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-label={legend}
        className="grid gap-1.5"
      >
        <ScopeCard
          selected={value === "currentMonthAndBudgetPlan"}
          disabled={disabled}
          onSelect={() => onChange("currentMonthAndBudgetPlan")}
          label={currentMonthAndBudgetPlanLabel}
          help={interpolate(currentMonthAndBudgetPlanHelp, { month: monthLabel })}
          testId={
            testId ? `${testId}-currentMonthAndBudgetPlan` : undefined
          }
        />
        <ScopeCard
          selected={value === "currentMonthOnly"}
          disabled={disabled}
          onSelect={() => onChange("currentMonthOnly")}
          label={interpolate(currentMonthOnlyLabel, { month: monthLabel })}
          help={interpolate(currentMonthOnlyHelp, { month: monthLabel })}
          testId={testId ? `${testId}-currentMonthOnly` : undefined}
        />
      </div>
    </div>
  );
}

type ScopeCardProps = {
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  label: string;
  help: string;
  testId?: string;
};

function ScopeCard({
  selected,
  disabled,
  onSelect,
  label,
  help,
  testId,
}: ScopeCardProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      className={cn(
        "flex min-h-[54px] items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
        "disabled:cursor-not-allowed disabled:opacity-60",
        selected
          ? "border-[rgb(var(--eb-accent)/0.42)] bg-white text-eb-text shadow-[0_10px_24px_rgba(21,39,81,0.07)]"
          : "border-eb-stroke/24 bg-[rgb(var(--eb-shell)/0.30)] text-eb-text/68 hover:bg-white/72",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          selected
            ? "border-[rgb(var(--eb-accent))] bg-[rgb(var(--eb-accent))]"
            : "border-eb-stroke/45 bg-white/60",
        )}
        aria-hidden="true"
      >
        {selected ? (
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
        ) : null}
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-extrabold leading-tight">
          {label}
        </span>
        <span className="mt-0.5 block text-xs font-medium leading-snug text-eb-text/58">
          {help}
        </span>
      </span>
    </button>
  );
}
