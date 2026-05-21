import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { SavingsMethodCode, SavingsMethodDto } from "@/types/budget/SavingsMethodDto";
import { isSavingsMethodCode } from "@/types/budget/SavingsMethodDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

type SavingsMethodsStripProps = {
  methods: readonly SavingsMethodDto[] | undefined;
};

// Plan-level savings methods (storage vehicles like "Sparkonto", "ISK",
// "Kontanter") rendered as a calm chip row beneath the savings hero.
// Methods belong to `Savings`, not to individual goals, so this strip is the
// only place the editor talks about methods — goal cards stay free of method
// metadata. The whole block stays hidden when there are no valid methods so
// an empty plan stays quiet.
//
// System codes resolve to localized labels through i18n; `custom` rows
// render their `customLabel` verbatim. Rows with unknown codes or invalid
// custom labels are dropped defensively so a regressed payload never blanks
// or crashes the chip row.
export default function SavingsMethodsStrip({
  methods,
}: SavingsMethodsStripProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const labelForCode = (code: SavingsMethodCode): string => {
    switch (code) {
      case "savings_account":
        return t("methodSavingsAccount");
      case "isk":
        return t("methodIsk");
      case "funds":
        return t("methodFunds");
      case "cash":
        return t("methodCash");
      case "custom":
        // Resolved by the caller via `customLabel`; never reached for valid
        // payloads, but the exhaustive switch keeps the typing honest.
        return "";
    }
  };

  type Chip = { id: string; label: string };

  const chips: Chip[] = (methods ?? []).reduce<Chip[]>((acc, row) => {
    if (!row || typeof row.id !== "string" || row.id.length === 0) return acc;
    if (!isSavingsMethodCode(row.code)) return acc;

    if (row.code === "custom") {
      const label = typeof row.customLabel === "string" ? row.customLabel.trim() : "";
      if (label.length === 0) return acc;
      acc.push({ id: row.id, label });
      return acc;
    }

    const label = labelForCode(row.code).trim();
    if (label.length === 0) return acc;
    acc.push({ id: row.id, label });
    return acc;
  }, []);

  if (chips.length === 0) return null;

  return (
    <section
      data-testid="savings-methods-strip"
      aria-label={t("savingsMethodsLabel")}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[1.75rem] border border-eb-stroke/25 bg-eb-surface/70 px-4 py-3 sm:px-5"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-eb-text/50">
        {t("savingsMethodsLabel")}
      </span>
      <ul className="flex flex-wrap items-center gap-1.5">
        {chips.map((chip) => (
          <li
            key={chip.id}
            data-testid="savings-methods-chip"
            className="inline-flex items-center rounded-full bg-eb-shell/45 px-2.5 py-1 text-[12px] font-semibold text-eb-text/75"
          >
            {chip.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
