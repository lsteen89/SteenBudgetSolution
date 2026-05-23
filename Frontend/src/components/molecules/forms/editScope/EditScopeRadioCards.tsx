import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { editScopeRadioCardsDict } from "@/utils/i18n/components/editScope/EditScopeRadioCards.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useEffect } from "react";

export type EditScopeRadioCardValue =
  | "currentMonthOnly"
  | "currentMonthAndBudgetPlan"
  | "budgetPlanOnly";

type EditScopeRadioCardsProps = {
  value: EditScopeRadioCardValue;
  onChange: (next: EditScopeRadioCardValue) => void;
  monthLabel: string;
  canUpdatePlan?: boolean;
  disabled?: boolean;
  disabledPlanHint?: string;
  className?: string;
  testId?: string;
};

export default function EditScopeRadioCards({
  value,
  onChange,
  monthLabel,
  canUpdatePlan = true,
  disabled = false,
  disabledPlanHint,
  className,
  testId,
}: EditScopeRadioCardsProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof editScopeRadioCardsDict.sv>(key: K) =>
    tDict(key, locale, editScopeRadioCardsDict);

  const legendId = testId ? `${testId}-legend` : undefined;
  const planDisabled = disabled || !canUpdatePlan;

  useEffect(() => {
    if (!canUpdatePlan && value !== "currentMonthOnly") {
      onChange("currentMonthOnly");
    }
  }, [canUpdatePlan, onChange, value]);

  return (
    <div className={cn("space-y-2", className)} data-testid={testId}>
      <div
        id={legendId}
        className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55"
      >
        {t("legend")}
      </div>

      <div
        role="radiogroup"
        aria-labelledby={legendId}
        aria-label={t("legend")}
        className="grid gap-1.5"
      >
        <ScopeCard
          selected={value === "currentMonthOnly"}
          disabled={disabled}
          onSelect={() => onChange("currentMonthOnly")}
          label={t("onlyThisMonth").replace("{month}", monthLabel)}
          help={t("onlyThisMonthHelp").replace("{month}", monthLabel)}
          testId={testId ? `${testId}-currentMonthOnly` : undefined}
        />

        <ScopeCard
          selected={value === "currentMonthAndBudgetPlan"}
          disabled={planDisabled}
          onSelect={() => onChange("currentMonthAndBudgetPlan")}
          label={t("updatePlanForward")}
          help={t("updatePlanForwardHelp").replace("{month}", monthLabel)}
          testId={
            testId ? `${testId}-currentMonthAndBudgetPlan` : undefined
          }
        />
        <ScopeCard
          selected={value === "budgetPlanOnly"}
          disabled={planDisabled}
          onSelect={() => onChange("budgetPlanOnly")}
          label={t("planOnlyForward")}
          help={t("planOnlyForwardHelp")}
          testId={testId ? `${testId}-budgetPlanOnly` : undefined}
        />

        {!canUpdatePlan && disabledPlanHint ? (
          <p className="px-1 text-[11.5px] leading-snug text-eb-text/55">
            {disabledPlanHint}
          </p>
        ) : null}
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
