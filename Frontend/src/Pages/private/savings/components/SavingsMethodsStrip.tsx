import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { SavingsMethodCode, SavingsMethodDto } from "@/types/budget/SavingsMethodDto";
import { isSavingsMethodCode } from "@/types/budget/SavingsMethodDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

type SavingsMethodsStripProps = {
  methods: readonly SavingsMethodDto[] | undefined;
  readOnly?: boolean;
  onEdit?: () => void;
};

// Plan-level savings methods rendered as a calm single-row strip beneath the
// savings hero. The strip stays in the page flow even when empty: an empty
// state surfaces a quiet dashed "Lägg till sparform" pill that opens the same
// editor, so the user can opt into methods without hunting for a menu.
//
// System codes resolve to localized labels through i18n; `custom` rows render
// their `customLabel` verbatim. Rows with unknown codes or invalid custom
// labels are dropped defensively so a regressed payload never blanks the
// chip row or shows raw codes.
//
// The whole component disappears when `readOnly` is true AND there are no
// valid methods — closed months should not invite the user to add methods
// they cannot save. When there ARE methods, a read-only month still renders
// them (with the Ändra button hidden) so the editor history stays visible.
export default function SavingsMethodsStrip({
  methods,
  readOnly = false,
  onEdit,
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

  const isEmpty = chips.length === 0;
  // Closed months with no methods would only show a disabled "Add" hint; that
  // is noise on a screen the user cannot act on. Hide instead.
  if (isEmpty && readOnly) return null;

  return (
    <section
      data-testid="savings-methods-strip"
      aria-label={t("savingsMethodsLabel")}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-eb-stroke/40 bg-eb-surface/80 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-nowrap sm:px-5"
    >
      <span className="flex-none whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.18em] text-eb-text/50">
        {t("savingsMethodsLabel")}
      </span>
      <span
        aria-hidden="true"
        className="hidden h-[18px] w-px flex-none bg-eb-stroke/55 sm:block"
      />
      <ul className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        {isEmpty ? (
          <li className="text-[13px] text-eb-text/50">
            {t("savingsMethodsEmptyChips")}
          </li>
        ) : (
          chips.map((chip) => (
            <li
              key={chip.id}
              data-testid="savings-methods-chip"
              className="inline-flex h-7 items-center rounded-full border border-eb-stroke/45 bg-eb-shell/40 px-[11px] text-[13px] font-semibold text-eb-text/80"
            >
              {chip.label}
            </li>
          ))
        )}
      </ul>
      {!readOnly && onEdit ? (
        isEmpty ? (
          <button
            type="button"
            onClick={onEdit}
            data-testid="savings-methods-add-empty-action"
            className="inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full border border-dashed border-eb-stroke/70 px-3 text-[12.5px] font-semibold text-eb-text/75 transition hover:border-eb-stroke hover:text-eb-text focus:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50"
          >
            <PlusGlyph />
            {t("savingsMethodsEmptyAddAction")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            data-testid="savings-methods-edit-action"
            className="inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full border border-eb-stroke/55 bg-eb-surface/85 px-3 text-[12.5px] font-semibold text-eb-text/75 transition hover:bg-eb-surface hover:text-eb-text focus:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50"
          >
            <PencilGlyph />
            {t("savingsMethodsEditAction")}
          </button>
        )
      ) : null}
    </section>
  );
}

// Inline lucide-style glyphs at 13px. Stroke-only, currentColor, so they
// pick up the eb-text foreground and stay quiet next to the chip text.
function PlusGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function PencilGlyph() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}
