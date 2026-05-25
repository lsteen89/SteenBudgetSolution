import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import SavingsGoalCard, {
  type SavingsGoalCardDensity,
} from "./SavingsGoalCard";
import SavingsGoalDraftCard, {
  type SavingsGoalDraftSubmitPayload,
} from "./SavingsGoalDraftCard";

const COMPACT_THRESHOLD = 5;

type SavingsGoalCardsListProps = {
  rows: BudgetMonthSavingsGoalEditorRowDto[];
  readOnly: boolean;
  referenceDate: Date;
  showPlannedMarkerLegend: boolean;
  onDeposit: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onMonthly: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onTargetDate: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onRename: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onChangeTarget: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onArchive: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  onRemove: (row: BudgetMonthSavingsGoalEditorRowDto) => void;
  draftOpen: boolean;
  draftSubmitting?: boolean;
  draftError?: string | null;
  onOpenDraft: () => void;
  onCancelDraft: () => void;
  onSubmitDraft: (payload: SavingsGoalDraftSubmitPayload) => Promise<void> | void;
};

export default function SavingsGoalCardsList({
  rows,
  readOnly,
  referenceDate,
  showPlannedMarkerLegend,
  onDeposit,
  onMonthly,
  onTargetDate,
  onRename,
  onChangeTarget,
  onArchive,
  onRemove,
  draftOpen,
  draftSubmitting = false,
  draftError = null,
  onOpenDraft,
  onCancelDraft,
  onSubmitDraft,
}: SavingsGoalCardsListProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const empty = rows.length === 0;
  const density: SavingsGoalCardDensity =
    rows.length >= COMPACT_THRESHOLD ? "compact" : "regular";

  return (
    <div data-testid="savings-goal-cards" className="grid gap-3">
      {empty && !draftOpen ? (
        <div
          data-testid="savings-goal-cards-empty"
          className="rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface/70 px-5 py-10 text-center text-sm text-eb-text/60"
        >
          {t("empty")}
        </div>
      ) : null}

      {showPlannedMarkerLegend && !empty ? (
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
          onDeposit={onDeposit}
          onMonthly={onMonthly}
          onTargetDate={onTargetDate}
          onRename={onRename}
          onChangeTarget={onChangeTarget}
          onArchive={onArchive}
          onRemove={onRemove}
        />
      ))}

      {draftOpen ? (
        <SavingsGoalDraftCard
          isSubmitting={draftSubmitting}
          errorMessage={draftError}
          onCancel={onCancelDraft}
          onSubmit={onSubmitDraft}
        />
      ) : readOnly ? (
        <button
          type="button"
          disabled
          aria-disabled="true"
          title={t("addGoalDisabledHint")}
          data-testid="savings-goal-add-placeholder"
          data-state="disabled"
          className="cursor-not-allowed rounded-[1.75rem] border-[1.5px] border-dashed border-eb-stroke/70 bg-transparent px-5 py-3.5 text-left text-sm font-semibold text-eb-text/55 opacity-70"
        >
          <span>{t("addGoal")}</span>
          <span className="ml-2 text-[12px] font-normal text-eb-text/45">
            · {t("addGoalDisabledHint")}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenDraft}
          data-testid="savings-goal-add-placeholder"
          data-state="ready"
          className="rounded-[1.75rem] border-[1.5px] border-dashed border-eb-stroke/70 bg-transparent px-5 py-3.5 text-left text-sm font-semibold text-eb-text/70 transition hover:border-eb-accent/70 hover:bg-eb-accent/5 hover:text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/30"
        >
          {t("addGoal")}
        </button>
      )}
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
