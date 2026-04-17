import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { deleteExpenseItemDialogDict } from "@/utils/i18n/pages/private/expenses/DeleteExpenseItemDialog.i18n";
import { tDict } from "@/utils/i18n/translate";
import { useEffect, useRef } from "react";

type DeleteExpenseItemDialogProps = {
  open: boolean;
  itemName: string | null;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function DeleteExpenseItemDialog({
  open,
  itemName,
  isDeleting = false,
  onClose,
  onConfirm,
}: DeleteExpenseItemDialogProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof deleteExpenseItemDialogDict.sv>(key: K) =>
    tDict(key, locale, deleteExpenseItemDialogDict);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      rootRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDownCapture={(event) => {
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-[95] outline-none"
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={onClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("dialogAriaLabel")}
          className="relative w-full max-w-md rounded-[2rem] border border-eb-stroke/25 bg-[rgb(var(--eb-shell))] shadow-[0_16px_60px_rgba(21,39,81,0.16)]"
        >
          <div className="rounded-[2rem] bg-eb-surface p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
              {t("eyebrow")}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-eb-text">
              {t("title")}
            </h2>

            <p className="mt-3 text-sm leading-6 text-eb-text/65">
              {t("description")}
            </p>

            <div className="mt-4 rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.28)] px-4 py-3">
              <p className="text-sm font-semibold text-eb-text">
                {itemName || t("unknownItem")}
              </p>
            </div>

            <p className="mt-4 text-sm text-eb-text/55">
              {t("impactDescription")}
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <CtaButton
                type="button"
                onClick={() => void onConfirm()}
                disabled={isDeleting}
                aria-busy={isDeleting}
                className="h-11 bg-eb-danger hover:bg-eb-danger"
              >
                {isDeleting ? t("deleting") : t("delete")}
              </CtaButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
