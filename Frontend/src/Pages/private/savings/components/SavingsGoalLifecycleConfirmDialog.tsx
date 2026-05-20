import { useEffect, useRef } from "react";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";

export type SavingsGoalLifecycleAction = "complete" | "cancel" | "remove";

type Props = {
  open: boolean;
  action: SavingsGoalLifecycleAction | null;
  goalName: string;
  isPlanLinked: boolean;
  isWorking: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsGoalLifecycleConfirmDialog({
  open,
  action,
  goalName,
  isPlanLinked,
  isWorking,
  onConfirm,
  onClose,
}: Props) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);
  const cancelRef = useRef<HTMLButtonElement | null>(null);

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

  const copy = resolveCopy(action, isPlanLinked, t);
  const interpolated = interpolate(copy.body, { name: goalName });
  const isDestructive = action !== "complete";

  return (
    <div className="fixed inset-0 z-[95]">
      <button
        type="button"
        aria-label={t("lifecycleConfirmCancelAction")}
        onClick={isWorking ? undefined : onClose}
        disabled={isWorking}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="savings-lifecycle-title"
          aria-describedby="savings-lifecycle-body"
          className={cn(
            "w-full max-w-[440px] rounded-[1.75rem] border border-eb-stroke/30 bg-eb-surface p-6",
            "shadow-[0_24px_60px_rgba(15,23,42,0.22)]",
          )}
          data-testid="savings-lifecycle-confirm"
        >
          <h2
            id="savings-lifecycle-title"
            className="text-[18px] font-semibold tracking-[-0.01em] text-eb-text"
          >
            {copy.title}
          </h2>
          <p
            id="savings-lifecycle-body"
            className="mt-3 text-[14px] leading-relaxed text-eb-text/70"
          >
            {interpolated}
          </p>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              ref={cancelRef}
              type="button"
              onClick={onClose}
              disabled={isWorking}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/30 px-4 text-sm font-medium text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("lifecycleConfirmCancelAction")}
            </button>
            <button
              type="button"
              onClick={onConfirm}
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

function resolveCopy(
  action: SavingsGoalLifecycleAction,
  isPlanLinked: boolean,
  t: <K extends keyof typeof savingsEditorPageDict.sv>(key: K) => string,
) {
  switch (action) {
    case "complete":
      return {
        title: t("lifecycleConfirmCompleteTitle"),
        body: isPlanLinked
          ? t("lifecycleConfirmCompleteBodyPlan")
          : t("lifecycleConfirmCompleteBody"),
        primary: t("lifecycleConfirmPrimaryComplete"),
      };
    case "cancel":
      return {
        title: t("lifecycleConfirmCancelTitle"),
        body: t("lifecycleConfirmCancelBody"),
        primary: t("lifecycleConfirmPrimaryCancel"),
      };
    case "remove":
      return {
        title: isPlanLinked
          ? t("lifecycleConfirmRemoveTitle")
          : t("lifecycleConfirmRemoveTitleMonthOnly"),
        body: isPlanLinked
          ? t("lifecycleConfirmRemoveBody")
          : t("lifecycleConfirmRemoveBodyMonthOnly"),
        primary: t("lifecycleConfirmPrimaryRemove"),
      };
  }
}
