import { useEffect, useRef, useState } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { debtsEditorPageDict } from "@/utils/i18n/pages/private/debts/DebtsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

/**
 * The six lifecycle / participation operations the kebab can trigger. Each maps
 * to exactly one PR 4 endpoint in the page handler; `skip` / `include` both hit
 * the participation route with the opposite value.
 */
export type DebtLifecycleAction =
  | "skip"
  | "include"
  | "markPaidOff"
  | "archive"
  | "restore"
  | "remove";

/**
 * Options the dialog collects for the two actions that carry a secondary
 * decision. Everything else confirms with no extra input. The page maps these
 * onto the request bodies (`setBalanceToZero`, `reIncludeCurrentMonth`).
 */
export type DebtLifecycleConfirmOptions = {
  setBalanceToZero: boolean;
  reIncludeCurrentMonth: boolean;
};

type Props = {
  open: boolean;
  action: DebtLifecycleAction | null;
  debtName: string;
  /** Display label for the open month (`maj 2026`). */
  yearMonthLabel: string;
  isWorking: boolean;
  onConfirm: (options: DebtLifecycleConfirmOptions) => void;
  onClose: () => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function DebtLifecycleConfirmDialog({
  open,
  action,
  debtName,
  yearMonthLabel,
  isWorking,
  onConfirm,
  onClose,
}: Props) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof debtsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, debtsEditorPageDict);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  // `setBalanceToZero` is deliberately opt-out (default false): marking paid
  // off is a status decision, never proof of a payment. `reIncludeCurrentMonth`
  // defaults to true so "Återställ" performs the natural full inverse of
  // archive — bringing the row back into the open month.
  const [setBalanceToZero, setSetBalanceToZero] = useState(false);
  const [reIncludeCurrentMonth, setReIncludeCurrentMonth] = useState(true);

  // Reset the secondary choices whenever a fresh action opens so a prior
  // session's checkbox state never leaks into the next confirmation.
  useEffect(() => {
    if (!open) return;
    setSetBalanceToZero(false);
    setReIncludeCurrentMonth(true);
  }, [open, action]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isWorking) {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
      previous?.focus?.();
    };
  }, [open, isWorking, onClose]);

  if (!open || !action) return null;

  const copy = resolveCopy(action, t);
  const body = interpolate(copy.body, {
    name: debtName,
    yearMonthLabel,
  });
  // Only `remove` is destructive — it deletes a month-only row outright. Skip /
  // paid / archive are all reversible and stay calm (no danger-red), exactly as
  // the handover's honesty rules require.
  const isDestructive = action === "remove";

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label={t("lifecycleConfirmCancel")}
        onClick={isWorking ? undefined : onClose}
        disabled={isWorking}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="debt-lifecycle-title"
          aria-describedby="debt-lifecycle-body"
          data-testid="debt-lifecycle-confirm"
          data-action={action}
          className={cn(
            "w-full max-w-[460px] rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface p-6",
            "shadow-[0_24px_60px_rgba(15,23,42,0.22)]",
          )}
        >
          <h2
            id="debt-lifecycle-title"
            className="text-[18px] font-semibold tracking-[-0.01em] text-eb-text"
          >
            {copy.title}
          </h2>
          <p
            id="debt-lifecycle-body"
            className="mt-3 text-[14px] leading-relaxed text-eb-text/70"
          >
            {body}
          </p>

          {action === "markPaidOff" ? (
            <ConfirmCheckbox
              testId="debt-lifecycle-set-balance-zero"
              checked={setBalanceToZero}
              disabled={isWorking}
              onChange={setSetBalanceToZero}
              label={t("lifecyclePaidZeroLabel")}
              hint={t("lifecyclePaidZeroHint")}
            />
          ) : null}

          {action === "restore" ? (
            <ConfirmCheckbox
              testId="debt-lifecycle-reinclude"
              checked={reIncludeCurrentMonth}
              disabled={isWorking}
              onChange={setReIncludeCurrentMonth}
              label={interpolate(t("lifecycleRestoreReincludeLabel"), {
                yearMonthLabel,
              })}
              hint={interpolate(t("lifecycleRestoreReincludeHint"), {
                yearMonthLabel,
              })}
            />
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/30 px-4 text-sm font-medium text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("lifecycleConfirmCancel")}
            </button>
            <button
              type="button"
              data-testid="debt-lifecycle-confirm-action"
              onClick={() =>
                onConfirm({ setBalanceToZero, reIncludeCurrentMonth })
              }
              disabled={isWorking}
              aria-busy={isWorking}
              data-tone={isDestructive ? "danger" : "primary"}
              className={cn(
                "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isDestructive
                  ? "bg-[rgb(var(--eb-danger))] text-white hover:brightness-[0.96]"
                  : "bg-[rgb(var(--eb-accent))] text-white hover:brightness-[0.96]",
              )}
            >
              {isWorking ? t("lifecycleConfirmWorking") : copy.primary}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmCheckbox({
  testId,
  checked,
  disabled,
  onChange,
  label,
  hint,
}: {
  testId: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.12)] px-4 py-3",
        disabled ? "cursor-not-allowed opacity-60" : "",
      )}
    >
      <input
        type="checkbox"
        data-testid={testId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 flex-none accent-[rgb(var(--eb-accent))]"
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-semibold text-eb-text">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-eb-text/60">
          {hint}
        </span>
      </span>
    </label>
  );
}

function resolveCopy(
  action: DebtLifecycleAction,
  t: <K extends keyof typeof debtsEditorPageDict.sv>(key: K) => string,
): { title: string; body: string; primary: string } {
  switch (action) {
    case "skip":
      return {
        title: t("lifecycleSkipTitle"),
        body: t("lifecycleSkipBody"),
        primary: t("lifecycleSkipPrimary"),
      };
    case "include":
      return {
        title: t("lifecycleIncludeTitle"),
        body: t("lifecycleIncludeBody"),
        primary: t("lifecycleIncludePrimary"),
      };
    case "markPaidOff":
      return {
        title: t("lifecyclePaidTitle"),
        body: t("lifecyclePaidBody"),
        primary: t("lifecyclePaidPrimary"),
      };
    case "archive":
      return {
        title: t("lifecycleArchiveTitle"),
        body: t("lifecycleArchiveBody"),
        primary: t("lifecycleArchivePrimary"),
      };
    case "restore":
      return {
        title: t("lifecycleRestoreTitle"),
        body: t("lifecycleRestoreBody"),
        primary: t("lifecycleRestorePrimary"),
      };
    case "remove":
      return {
        title: t("lifecycleRemoveTitle"),
        body: t("lifecycleRemoveBody"),
        primary: t("lifecycleRemovePrimary"),
      };
  }
}
