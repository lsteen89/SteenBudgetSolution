import CalcBird from "@assets/Images/CalcBird.png";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { Plus } from "lucide-react";

type DebtsEditorEmptyStateProps = {
  /** Page-level read-only flag — hides the add CTA. */
  readOnly: boolean;
};

/**
 * Calm empty state. The single `Lägg till skuld` CTA mirrors the hero's: it
 * stays disabled in PR 6 because the add-debt FE wiring lands in PR 7.
 */
export default function DebtsEditorEmptyState({
  readOnly,
}: DebtsEditorEmptyStateProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);

  return (
    <section
      data-testid="debts-editor-empty"
      className={cn(
        "rounded-[1.75rem] border border-eb-stroke/16 bg-eb-surface/85",
        "px-6 py-9 text-center shadow-[0_10px_30px_rgba(21,39,81,0.04)]",
      )}
    >
      <img
        src={CalcBird}
        alt=""
        aria-hidden="true"
        className="mx-auto h-20 w-20 object-contain"
      />
      <h3 className="mt-4 text-[18px] font-extrabold text-eb-text">
        {t("emptyHeading")}
      </h3>
      <p className="mx-auto mt-2 max-w-[34rem] text-[13.5px] text-eb-text/65">
        {t("emptyBody")}
      </p>

      {!readOnly ? (
        <div className="mt-5 flex justify-center">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title={t("heroCtaPendingPr")}
            data-testid="debts-empty-add"
            data-pending-pr="PR-07"
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "bg-eb-accent/45 px-5 py-2.5 text-sm font-semibold text-white/85",
              "shadow-eb",
              "cursor-not-allowed",
            )}
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            {t("heroCta")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
