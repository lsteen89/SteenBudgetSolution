import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  SavingsMethodCode,
  SavingsMethodDto,
} from "@/types/budget/SavingsMethodDto";
import { isSavingsMethodCode } from "@/types/budget/SavingsMethodDto";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

// "Hantera sparformer" — the editor for plan-level savings methods. Sits in
// a modal (not a popover) so it works the same on desktop and on touch. The
// helper line restates the scope ("gäller hela sparplanen") so the editor
// stays honest about what changing a method does and does not do.
//
// All mutations are awaited then surfaced through error props; the parent
// owns the toast/UX feedback. No confirmation on remove — the editor is
// reversible by re-adding the chip, matching the design verdict's "calm UX
// trusts the user" rule.

const SYSTEM_CODE_ORDER: readonly Exclude<SavingsMethodCode, "custom">[] = [
  "savings_account",
  "isk",
  "funds",
  "cash",
];

const MAX_CUSTOM_LABEL_LENGTH = 120;

type Props = {
  open: boolean;
  methods: readonly SavingsMethodDto[] | undefined;
  isAdding: boolean;
  removingId: string | null;
  errorMessage: string | null;
  onAdd: (payload: {
    code: SavingsMethodCode;
    customLabel?: string | null;
  }) => Promise<void>;
  onRemove: (savingsMethodId: string, label: string) => Promise<void>;
  onClose: () => void;
};

export default function SavingsMethodsEditor({
  open,
  methods,
  isAdding,
  removingId,
  errorMessage,
  onAdd,
  onRemove,
  onClose,
}: Props) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const interpolate = (template: string, values: Record<string, string>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");

  const labelForCode = useCallback(
    (code: SavingsMethodCode): string => {
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
          return "";
      }
    },
    [t],
  );

  const closeRef = useRef<HTMLButtonElement | null>(null);
  const customInputRef = useRef<HTMLInputElement | null>(null);
  const [customDraft, setCustomDraft] = useState("");

  // Reset the draft + re-focus close when the editor opens. Esc to close,
  // matched to the page's other modals.
  useEffect(() => {
    if (!open) return;
    setCustomDraft("");
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  type Row = { id: string; code: SavingsMethodCode; label: string };

  const rows: Row[] = useMemo(() => {
    const acc: Row[] = [];
    for (const row of methods ?? []) {
      if (!row || typeof row.id !== "string" || row.id.length === 0) continue;
      if (!isSavingsMethodCode(row.code)) continue;
      if (row.code === "custom") {
        const label =
          typeof row.customLabel === "string" ? row.customLabel.trim() : "";
        if (label.length === 0) continue;
        acc.push({ id: row.id, code: "custom", label });
        continue;
      }
      const label = labelForCode(row.code).trim();
      if (label.length === 0) continue;
      acc.push({ id: row.id, code: row.code, label });
    }
    return acc;
  }, [methods, labelForCode]);

  const usedSystemCodes = useMemo(() => {
    const set = new Set<SavingsMethodCode>();
    for (const row of rows) {
      if (row.code !== "custom") set.add(row.code);
    }
    return set;
  }, [rows]);

  const suggestions = useMemo(
    () => SYSTEM_CODE_ORDER.filter((code) => !usedSystemCodes.has(code)),
    [usedSystemCodes],
  );

  const handleAddSystem = useCallback(
    async (code: SavingsMethodCode) => {
      if (isAdding) return;
      try {
        await onAdd({ code, customLabel: null });
      } catch {
        // Parent reports the error via `errorMessage`.
      }
    },
    [isAdding, onAdd],
  );

  const handleAddCustom = useCallback(async () => {
    if (isAdding) return;
    const trimmed = customDraft.trim();
    if (trimmed.length === 0) return;
    try {
      await onAdd({ code: "custom", customLabel: trimmed });
      setCustomDraft("");
      customInputRef.current?.focus();
    } catch {
      // Keep the draft so the user can retry without retyping.
    }
  }, [customDraft, isAdding, onAdd]);

  const handleRemove = useCallback(
    async (id: string, label: string) => {
      if (removingId) return;
      try {
        await onRemove(id, label);
      } catch {
        // Parent reports the error via `errorMessage`.
      }
    },
    [onRemove, removingId],
  );

  if (!open) return null;

  const customDraftReady = customDraft.trim().length > 0 && !isAdding;

  return (
    <div
      className="fixed inset-0 z-[95]"
      data-testid="savings-methods-editor"
    >
      <button
        type="button"
        aria-label={t("savingsMethodsEditorClose")}
        onClick={onClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="savings-methods-editor-title"
          aria-describedby="savings-methods-editor-helper"
          className={cn(
            "relative w-full max-w-[460px] overflow-hidden rounded-[1.5rem] border border-eb-stroke/40 bg-eb-surface",
            "shadow-[0_24px_60px_rgba(15,23,42,0.22),0_2px_10px_rgba(15,23,42,0.08)]",
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-4">
            <div className="min-w-0">
              <h2
                id="savings-methods-editor-title"
                className="text-[16px] font-bold tracking-[-0.01em] text-eb-text"
              >
                {t("savingsMethodsEditorTitle")}
              </h2>
              <p
                id="savings-methods-editor-helper"
                className="mt-1 text-[12.5px] leading-snug text-eb-text/60"
              >
                {t("savingsMethodsEditorHelper")}
              </p>
            </div>
            <button
              ref={closeRef}
              type="button"
              aria-label={t("savingsMethodsEditorClose")}
              onClick={onClose}
              className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-eb-stroke/50 text-eb-text/60 transition hover:text-eb-text focus:outline-none focus-visible:ring-2 focus-visible:ring-eb-accent/50"
            >
              <CloseGlyph />
            </button>
          </div>

          {/* Add input */}
          <div className="px-5 pb-3">
            <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-eb-text/50">
              {t("savingsMethodsEditorAddHeading")}
            </div>
            <div className="flex h-10 items-center gap-2 rounded-xl border border-eb-stroke/55 bg-eb-surface px-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)_inset]">
              <PlusGlyph size={14} />
              <input
                ref={customInputRef}
                type="text"
                value={customDraft}
                onChange={(event) =>
                  setCustomDraft(event.target.value.slice(0, MAX_CUSTOM_LABEL_LENGTH))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleAddCustom();
                  }
                }}
                placeholder={t("savingsMethodsEditorCustomPlaceholder")}
                maxLength={MAX_CUSTOM_LABEL_LENGTH}
                disabled={isAdding}
                className="flex-1 border-0 bg-transparent text-[13.5px] text-eb-text outline-none placeholder:text-eb-text/40 disabled:opacity-50"
                aria-label={t("savingsMethodsEditorCustomPlaceholder")}
              />
              <button
                type="button"
                onClick={() => {
                  void handleAddCustom();
                }}
                disabled={!customDraftReady}
                className={cn(
                  "inline-flex h-[30px] items-center rounded-full px-3 text-[12.5px] font-semibold transition",
                  customDraftReady
                    ? "bg-[rgb(var(--eb-accent))] text-white hover:brightness-[0.97]"
                    : "cursor-default bg-eb-text/[0.08] text-eb-text/45",
                )}
              >
                {t("savingsMethodsEditorAddCustomSubmit")}
              </button>
            </div>

            {suggestions.length > 0 ? (
              <>
                <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-eb-text/50">
                  {t("savingsMethodsEditorSuggestionsHeading")}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {suggestions.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        void handleAddSystem(code);
                      }}
                      disabled={isAdding}
                      data-testid="savings-methods-suggestion"
                      data-code={code}
                      className="inline-flex h-[30px] items-center gap-1.5 rounded-full border border-dashed border-eb-stroke/70 bg-eb-surface px-3 text-[12.5px] font-semibold text-eb-text/75 transition hover:border-eb-stroke hover:text-eb-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <PlusGlyph size={12} />
                      {labelForCode(code)}
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="h-px bg-eb-stroke/40" />

          {/* Current methods */}
          <div className="px-5 pb-4 pt-3.5">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-eb-text/50">
              {t("savingsMethodsEditorCurrentHeading")}
            </div>
            {rows.length === 0 ? (
              <div className="rounded-xl border border-dashed border-eb-stroke/55 bg-eb-shell/30 px-3.5 py-3 text-[12.5px] text-eb-text/60">
                {t("savingsMethodsEditorCurrentEmpty")}
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center gap-2.5 rounded-xl border border-eb-stroke/45 bg-eb-surface px-3 py-2.5"
                  >
                    <span className="min-w-0 flex-1 text-[13.5px] font-semibold text-eb-text">
                      {row.label}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleRemove(row.id, row.label);
                      }}
                      disabled={removingId !== null}
                      aria-label={interpolate(
                        t("savingsMethodsEditorRemoveAriaLabel"),
                        { label: row.label },
                      )}
                      data-testid="savings-methods-remove"
                      data-row-id={row.id}
                      className="inline-flex h-7 items-center gap-1 rounded-full border border-eb-stroke/55 px-2.5 text-[12px] font-semibold text-eb-text/60 transition hover:text-eb-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <XGlyph />
                      {removingId === row.id
                        ? "…"
                        : t("savingsMethodsEditorRemoveAction")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errorMessage ? (
              <p
                role="alert"
                className="mt-3 text-[12.5px] font-medium text-eb-danger"
                data-testid="savings-methods-editor-error"
              >
                {errorMessage}
              </p>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 border-t border-eb-stroke/40 bg-eb-shell/15 px-5 py-3">
            <span className="text-[11.5px] text-eb-text/55">
              {t("savingsMethodsEditorAutosaveNote")}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 items-center rounded-full border border-eb-stroke/55 bg-eb-surface px-3.5 text-[12.5px] font-semibold text-eb-text/80 transition hover:text-eb-text"
            >
              {t("savingsMethodsEditorDone")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlusGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
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

function XGlyph() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function CloseGlyph() {
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
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
