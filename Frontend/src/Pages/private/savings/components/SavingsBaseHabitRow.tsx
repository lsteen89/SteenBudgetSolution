import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";

type SavingsBaseHabitRowProps = {
  /** Steady base monthly savings (Savings.MonthlySavings). */
  baseMonthly: number;
  readOnly: boolean;
  onEdit: () => void;
};

// The "Bassparande" row surfaces the steady base monthly savings amount that
// onboarding writes once and nothing else currently edits. It sits between the
// saving-methods strip and the balance strip so the page reads top-to-bottom as
// habit → goals → month room. The Justera dialog it opens is a placeholder
// editor until the Savings.MonthlySavings endpoint exists (see MVP report).
export default function SavingsBaseHabitRow({
  baseMonthly,
  readOnly,
  onEdit,
}: SavingsBaseHabitRowProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const baseFormatted = formatMoneyV2(baseMonthly, currency, locale, {
    fractionDigits: moneyDecimalsFor(baseMonthly),
  });

  return (
    <section
      data-testid="savings-base-habit-row"
      aria-label={t("habitRowLabel")}
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[1.5rem] border border-eb-stroke/40 bg-[linear-gradient(135deg,rgb(var(--eb-shell)/0.32),rgb(var(--eb-surface)/0.9))] px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6 sm:py-[18px]"
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-eb-text/55">
            {t("habitRowLabel")}
          </span>
          <span className="inline-flex h-[18px] items-center rounded-md bg-eb-accent/15 px-[7px] text-[10.5px] font-extrabold tracking-[0.08em] text-[#14532d]">
            {t("habitRowNewTag")}
          </span>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <strong className="text-[22px] font-extrabold tabular-nums text-eb-text">
            {baseFormatted}
          </strong>
          <span className="text-[13px] text-eb-text/60">
            {t("habitRowUnit")}
          </span>
        </div>
        <p className="m-0 max-w-[52ch] text-[13px] leading-relaxed text-eb-text/62">
          {t("habitRowNote")}
        </p>
      </div>

      <button
        type="button"
        disabled={readOnly}
        onClick={onEdit}
        data-testid="savings-base-habit-edit-action"
        title={readOnly ? t("habitRowReadOnlyHint") : undefined}
        className="h-8 whitespace-nowrap rounded-full border border-eb-stroke/60 bg-eb-surface px-3.5 text-[12px] font-semibold text-eb-text/75 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-eb-surface"
      >
        {t("habitRowAdjust")}
      </button>
    </section>
  );
}
