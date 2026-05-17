import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import SavingsGoalCard, {
  type SavingsGoalCardDensity,
} from "./SavingsGoalCard";

const COMPACT_THRESHOLD = 5;

type SavingsGoalCardsListProps = {
  rows: BudgetMonthSavingsGoalEditorRowDto[];
  readOnly: boolean;
  referenceDate: Date;
  showPlannedMarkerLegend: boolean;
  onEdit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
};

export default function SavingsGoalCardsList({
  rows,
  readOnly,
  referenceDate,
  showPlannedMarkerLegend,
  onEdit,
}: SavingsGoalCardsListProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  if (rows.length === 0) {
    return (
      <div
        data-testid="savings-goal-cards-empty"
        className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-10 text-center text-sm text-eb-text/60"
      >
        {t("empty")}
      </div>
    );
  }

  const density: SavingsGoalCardDensity =
    rows.length >= COMPACT_THRESHOLD ? "compact" : "regular";

  return (
    <div data-testid="savings-goal-cards" className="grid gap-3">
      {showPlannedMarkerLegend ? (
        <ProgressMarkerLegend
          actualLabel={t("legendActual")}
          plannedLabel={t("legendPlanned")}
          explanation={t("legendExplanation")}
        />
      ) : null}

      {rows.map((row) => (
        <SavingsGoalCard
          key={row.id}
          row={row}
          readOnly={readOnly}
          referenceDate={referenceDate}
          density={density}
          onEdit={onEdit}
        />
      ))}

      <button
        type="button"
        disabled
        title={t("addGoalDisabledHint")}
        aria-disabled="true"
        className="cursor-not-allowed rounded-[1.75rem] border-[1.5px] border-dashed border-eb-stroke/70 bg-transparent px-5 py-3.5 text-left text-sm font-semibold text-eb-text/55 opacity-70"
      >
        <span>{t("addGoal")}</span>
        <span className="ml-2 text-[12px] font-normal text-eb-text/45">
          · {t("addGoalDisabledHint")}
        </span>
      </button>
    </div>
  );
}

function ProgressMarkerLegend({
  actualLabel,
  plannedLabel,
  explanation,
}: {
  actualLabel: string;
  plannedLabel: string;
  explanation: string;
}) {
  return (
    <div
      data-testid="savings-progress-legend"
      className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1 text-[12px] text-eb-text/55"
    >
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-2 w-6 rounded-full"
          style={{
            background:
              "linear-gradient(to right, rgb(var(--eb-accent-soft)), rgb(var(--eb-accent)))",
          }}
        />
        {actualLabel}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="inline-block h-3 w-[3px] rounded-sm bg-eb-text/55"
        />
        {plannedLabel}
      </span>
      <span className="text-eb-text/45">· {explanation}</span>
    </div>
  );
}
