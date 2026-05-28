import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { BudgetMonthSavingsGoalEditorRowDto } from "@/types/budget/BudgetMonthsStatusDto";
import { savingsGoalTargetAmountModalDict } from "@/utils/i18n/pages/private/savings/SavingsGoalTargetAmountModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2, moneyDecimalsFor } from "@/utils/money/moneyV2";
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

/**
 * V2 PR-10 — "Ändra målbelopp" focused modal.
 *
 * Wires the kebab → Ändra målbelopp item on each goal card to the
 * `PATCH .../savings-goals/{id}/target-amount` endpoint shipped in
 * PR-06.
 *
 * Design intent (`Work/Dashboard/savings/PR-10-fe-kebab-rename-target-amount.md`):
 *   - One modal, one mutation. Target amount is plan-level; the BE
 *     writes both rows in one transaction when a baseline exists.
 *   - The BE rejects targets that would land below `amountSaved` with
 *     `BudgetMonthSavingsGoal.TargetBelowSaved`. The FE enforces the
 *     same rule inline so the user is told before the round-trip —
 *     the BE remains the source of truth as defence-in-depth.
 *   - Outcome line is a pure FE preview: "at the current monthly,
 *     you'll reach the new target in N months". The user opens
 *     Månadsbelopp separately if they want to act on it.
 */
export type SavingsGoalTargetAmountSavePayload = {
  targetAmount: number;
};

type SavingsGoalTargetAmountModalProps = {
  open: boolean;
  row: BudgetMonthSavingsGoalEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (
    values: SavingsGoalTargetAmountSavePayload,
  ) => Promise<void> | void;
};

const MAX_TARGET_AMOUNT = 10_000_000;

type FieldErrors = {
  targetAmount?: string;
};

function formatNumberForInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatDateForInput(value: string | null | undefined): string {
  if (!value) return "";
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : "";
}

function formatIsoDateForDisplay(value: string, locale: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

const interpolate = (
  template: string,
  values: Record<string, string | number>,
) => template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function SavingsGoalTargetAmountModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  errorMessage,
  onClose,
  onSubmit,
}: SavingsGoalTargetAmountModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof savingsGoalTargetAmountModalDict.sv>(
    key: K,
  ) => tDict(key, locale, savingsGoalTargetAmountModalDict);
  const reactId = useId();
  const amountInputId = `${reactId}-amount`;

  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!open || !row) return;
    setAmount(formatNumberForInput(row.targetAmount));
    setErrors({});
  }, [open, row]);

  const fmtMoney = useMemo(
    () => (value: number) =>
      formatMoneyV2(value, currency, locale, {
        fractionDigits: moneyDecimalsFor(value),
      }),
    [currency, locale],
  );

  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amount, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amount],
  );

  const saved = row?.amountSaved ?? 0;
  const originalTarget = row?.targetAmount ?? null;
  const monthlyContribution = row?.monthlyContribution ?? 0;

  const isUnchanged =
    parsedAmount != null && originalTarget != null && parsedAmount === originalTarget;
  const belowSaved =
    parsedAmount != null && parsedAmount < saved;

  const outcomeText = useMemo(() => {
    if (parsedAmount == null || parsedAmount <= 0) return null;
    if (belowSaved) return null;

    const target = parsedAmount;
    const remaining = Math.max(0, target - saved);
    if (remaining === 0) {
      // `belowSaved` (target < saved) is already an early-return above,
      // so this branch only fires when target === saved. The previous
      // copy interpolated a `{over}` value computed as `saved - target`
      // which is always 0 in this reachable path; the message now just
      // says "you are already at the target".
      return interpolate(t("outcomeReached"), {
        saved: fmtMoney(saved),
      });
    }

    if (monthlyContribution <= 0) {
      return interpolate(t("outcomeOngoingNoMonthly"), {
        target: fmtMoney(target),
      });
    }

    const months = Math.ceil(remaining / monthlyContribution);
    return interpolate(t("outcomeOngoing"), {
      target: fmtMoney(target),
      monthly: fmtMoney(monthlyContribution),
      months,
    });
  }, [parsedAmount, belowSaved, saved, monthlyContribution, fmtMoney, t]);

  const updateAmount = (value: string) => {
    setAmount(value);
    if (errors.targetAmount) {
      setErrors((prev) => ({ ...prev, targetAmount: undefined }));
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) return;
    if (!row) return;

    const next: FieldErrors = {};
    if (parsedAmount == null) {
      next.targetAmount =
        amount.trim().length === 0 ? t("amountRequired") : t("amountInvalid");
    } else if (parsedAmount <= 0) {
      next.targetAmount = t("amountNotPositive");
    } else if (parsedAmount > MAX_TARGET_AMOUNT) {
      next.targetAmount = t("amountTooLarge");
    } else if (parsedAmount < saved) {
      next.targetAmount = interpolate(t("amountBelowSaved"), {
        saved: fmtMoney(saved),
      });
    }

    if (next.targetAmount) {
      setErrors(next);
      return;
    }
    if (isUnchanged) {
      // Defer to the BE's no-op short-circuit by closing without
      // firing a round-trip.
      onClose();
      return;
    }

    setErrors({});
    await onSubmit({ targetAmount: parsedAmount! });
  };

  if (!open || !row) return null;

  const snapshotSaved = fmtMoney(saved);
  const snapshotTarget =
    originalTarget != null ? fmtMoney(originalTarget) : "—";
  const snapshotDeadline =
    formatIsoDateForDisplay(formatDateForInput(row.targetDate), locale) ||
    t("snapshotDeadlineOngoing");

  // Save stays enabled on field-level invalid states (empty, malformed,
  // out of range, below saved) so the form's onSubmit can render the
  // inline error. We only block the click when the mutation is in
  // flight, or when the parsed value matches the row's current target —
  // in which case Save is a no-op and the unchanged hint is visible.
  const saveDisabled = isSaving || isUnchanged;

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        data-testid="savings-goal-target-amount-backdrop"
        onClick={isSaving ? undefined : onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[520px]">
          <BudgetEntryModalShell
            titleId="savings-goal-target-amount-modal-title"
            descriptionId="savings-goal-target-amount-modal-description"
            eyebrow={t("eyebrow")}
            title={t("title")}
            context={`${row.name} · ${monthLabel}`}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={!isSaving}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-medium text-eb-text/45">
                  {t("footerNote")}
                </span>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("cancel")}
                  </button>
                  <CtaButton
                    type="submit"
                    form="savings-goal-target-amount-form"
                    disabled={saveDisabled}
                    aria-busy={isSaving}
                    className="h-11"
                    data-testid="savings-goal-target-amount-save"
                  >
                    {isSaving ? t("saving") : t("saveChanges")}
                  </CtaButton>
                </div>
              </div>
            }
          >
            <form
              id="savings-goal-target-amount-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <SnapshotDl
                saved={snapshotSaved}
                target={snapshotTarget}
                deadline={snapshotDeadline}
                labels={{
                  saved: t("snapshotSavedLabel"),
                  target: t("snapshotTargetLabel"),
                  deadline: t("snapshotDeadlineLabel"),
                }}
              />

              <FormField
                label={t("amountLabel")}
                htmlFor={amountInputId}
                error={errors.targetAmount}
              >
                <MoneyInput
                  id={amountInputId}
                  value={amount}
                  onChange={(event) => updateAmount(event.target.value)}
                  disabled={isSaving}
                  className="h-14 text-[22px]"
                  data-testid="savings-goal-target-amount-input"
                  aria-invalid={errors.targetAmount ? "true" : undefined}
                />
              </FormField>

              {outcomeText ? (
                <div
                  role="status"
                  aria-live="polite"
                  data-testid="savings-goal-target-amount-outcome"
                  className="rounded-2xl border border-eb-accent/20 bg-eb-accentSoft px-4 py-3 text-[13px] leading-relaxed text-[#14532d]"
                >
                  <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#14532d]/70">
                    {t("outcomeLabel")}
                  </span>
                  <span className="mt-1 block font-semibold">
                    {outcomeText}
                  </span>
                </div>
              ) : null}

              {isUnchanged ? (
                <p
                  data-testid="savings-goal-target-amount-unchanged"
                  className="text-xs text-eb-text/55"
                >
                  {t("amountUnchanged")}
                </p>
              ) : null}

              {errorMessage ? (
                <p
                  role="alert"
                  data-testid="savings-goal-target-amount-error"
                  className="rounded-2xl border border-eb-danger/30 bg-[rgb(var(--eb-danger)/0.06)] px-4 py-2.5 text-sm font-medium text-eb-danger"
                >
                  {errorMessage}
                </p>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}

function SnapshotDl({
  saved,
  target,
  deadline,
  labels,
}: {
  saved: string;
  target: string;
  deadline: string;
  labels: { saved: string; target: string; deadline: string };
}) {
  return (
    <dl
      data-testid="savings-goal-modal-snapshot"
      className="grid grid-cols-3 gap-2.5"
    >
      <SnapshotCell label={labels.saved} value={saved} />
      <SnapshotCell label={labels.target} value={target} />
      <SnapshotCell label={labels.deadline} value={deadline} />
    </dl>
  );
}

function SnapshotCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-eb-stroke/40 bg-[rgb(var(--eb-shell)/0.18)] px-3 py-2.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-eb-text/50">
        {label}
      </dt>
      <dd className="mt-1 text-[14px] font-extrabold tabular-nums text-eb-text">
        {value}
      </dd>
    </div>
  );
}
