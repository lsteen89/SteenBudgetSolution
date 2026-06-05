import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { DebtEditScope } from "@/types/budget/BudgetMonthsStatusDto";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import { debtBalanceModalDict } from "@/utils/i18n/pages/private/debts/DebtBalanceModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

const NOTE_MAX_LENGTH = 500;

export type DebtBalanceSubmitValues = {
  newBalance: number;
  scope: DebtEditScope;
  note: string | null;
};

type DebtBalanceModalProps = {
  open: boolean;
  row: DebtEditorRowDto | null;
  /** Display label for the open month (`maj 2026`). */
  monthLabel: string;
  isSaving?: boolean;
  /**
   * Backend error message surfaced from the most recent failed submit. The
   * parent owns the mutation; this modal renders the message without knowing
   * about React-Query.
   */
  submitErrorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: DebtBalanceSubmitValues) => Promise<void>;
};

/**
 * Debt PR 9 — `Uppdatera saldo` drawer. The only frontend surface allowed to
 * change a debt balance by hand. Wires the PR 3 backend
 * (`POST /api/budgets/months/{ym}/debt-items/{id}/balance-adjustments`).
 *
 * The planned monthly payment is shown read-only for context and is never
 * editable here — balance and payment are kept strictly separate, in the
 * inverse direction of the planned-payment drawer's "saldo påverkas inte"
 * promise. A lower balance is presented calmly (a correction, never a
 * celebration), and zero balance does NOT imply paid-off — that remains the
 * PR 8 lifecycle action.
 *
 * Plan-writing scopes are gated on `actions.canUpdatePlan` (false for
 * month-only rows and for any closed month), so a stale local choice can
 * never leak a plan write.
 */
export default function DebtBalanceModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  submitErrorMessage = null,
  onClose,
  onSubmit,
}: DebtBalanceModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtBalanceModalDict.sv>(key: K) =>
    tDict(key, locale, debtBalanceModalDict);

  const [newBalance, setNewBalance] = useState("");
  const [note, setNote] = useState("");
  const [scope, setScope] = useState<DebtEditScope>("currentMonthOnly");
  const [error, setError] = useState<string | null>(null);
  // Tracks whether the user has typed in the balance field. While untouched we
  // keep the input mirroring the scope-appropriate current balance; once the
  // user edits, their value is preserved across scope switches.
  const [balanceDirty, setBalanceDirty] = useState(false);

  // Seed from the row's month-side balance on every open (default scope is
  // currentMonthOnly). The scope cards decide whether the write also fans out
  // to the linked source.
  useEffect(() => {
    if (!open) return;
    if (!row) return;
    setNewBalance(formatNumeric(row.balance));
    setNote("");
    setScope("currentMonthOnly");
    setError(null);
    setBalanceDirty(false);
  }, [open, row]);

  useEffect(() => {
    if (!open) return;
    if (isSaving) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isSaving, onClose]);

  if (!open || !row) return null;

  const canUpdatePlan = row.actions.canUpdatePlan;
  const canClose = !isSaving;
  const balanceText = formatMoneyV2(row.balance, currency, locale, {
    fractionDigits: 0,
  });
  const paymentText = formatMoneyV2(row.monthlyPayment, currency, locale, {
    fractionDigits: 0,
  });

  // Scope-aware seed: `budgetPlanOnly` corrects the linked plan row, so it must
  // seed from the *source* balance, not the month balance — otherwise a submit
  // without an edit would silently write the month balance into the source when
  // the two diverge. `currentMonthOnly` and `currentMonthAndBudgetPlan` are
  // anchored on the month value the user is looking at (the latter writes that
  // one new value to both sides).
  const seedForScope = (next: DebtEditScope): string =>
    next === "budgetPlanOnly"
      ? formatNumeric(row.sourceBalance ?? row.balance)
      : formatNumeric(row.balance);

  // Re-seed the input on scope change so the field shows the current value of
  // the balance that scope will actually correct — but only while the user has
  // not typed their own value, so a manual edit is never silently clobbered by
  // switching scope.
  const handleScopeChange = (next: DebtEditScope) => {
    setScope(next);
    if (!balanceDirty) {
      setNewBalance(seedForScope(next));
    }
  };

  const handleBalanceInput = (value: string) => {
    setNewBalance(value);
    setBalanceDirty(true);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newBalance.trim() === "") {
      setError(t("balanceRequired"));
      return;
    }

    const parsedBalance = parseMoneyInput(newBalance, {
      allowNegative: false,
      maxDecimals: 2,
    });
    if (parsedBalance === null) {
      setError(t("balanceInvalid"));
      return;
    }

    const trimmedNote = note.trim();
    if (trimmedNote.length > NOTE_MAX_LENGTH) {
      setError(t("noteTooLong"));
      return;
    }

    // Defensive narrow — never let a month-only row leak a plan-write through
    // the wire even if the local scope state somehow diverged.
    const safeScope: DebtEditScope = canUpdatePlan ? scope : "currentMonthOnly";

    setError(null);
    await onSubmit({
      newBalance: parsedBalance,
      scope: safeScope,
      note: trimmedNote.length > 0 ? trimmedNote : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[90]"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !canClose) return;
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={canClose ? onClose : undefined}
        disabled={!canClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[680px]">
          <BudgetEntryModalShell
            titleId="debt-balance-modal-title"
            descriptionId="debt-balance-modal-description"
            eyebrow={t("eyebrow")}
            title={t("title")}
            context={`${row.name} · ${monthLabel}`}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={canClose}
            onClose={onClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={!canClose}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("cancel")}
                </button>
                <CtaButton
                  type="submit"
                  form="debt-balance-form"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-11"
                >
                  {isSaving ? t("saving") : t("save")}
                </CtaButton>
              </div>
            }
          >
            <form
              id="debt-balance-form"
              data-testid="debt-balance-form"
              onSubmit={submit}
              className="grid gap-4"
              noValidate
            >
              {/* Read-only context — current balance AND current planned
                  payment, so the user sees both numbers and that only the
                  balance is editable. */}
              <section
                data-testid="debt-balance-context"
                className="rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.18)] px-4 py-3"
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55">
                  {t("legendContext")}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-eb-text/65">
                    {t("contextBalanceLabel")}
                  </span>
                  <strong
                    data-testid="debt-balance-context-balance"
                    className="text-[15px] font-extrabold tabular-nums text-eb-text"
                  >
                    {balanceText}
                  </strong>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-eb-text/65">
                    {t("contextPaymentLabel")}
                  </span>
                  <strong
                    data-testid="debt-balance-context-payment"
                    className="text-[15px] font-extrabold tabular-nums text-eb-text"
                  >
                    {paymentText}
                  </strong>
                </div>
                <p className="mt-1 text-[12px] text-eb-text/55">
                  {t("contextPaymentHint")}
                </p>
              </section>

              <FormField
                label={t("newBalanceLabel")}
                htmlFor="debt-balance-amount"
                hint={t("newBalanceHint")}
              >
                <MoneyInput
                  id="debt-balance-amount"
                  value={newBalance}
                  onChange={(event) => handleBalanceInput(event.target.value)}
                />
              </FormField>

              <FormField
                label={t("noteLabel")}
                htmlFor="debt-balance-note"
                hint={t("noteOptional")}
              >
                <textarea
                  id="debt-balance-note"
                  data-testid="debt-balance-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t("notePlaceholder")}
                  maxLength={NOTE_MAX_LENGTH}
                  rows={2}
                  className="flex w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 py-2.5 text-sm text-eb-text outline-none transition focus:border-eb-stroke/40 focus:ring-2 focus:ring-[rgb(var(--eb-accent)/0.16)]"
                />
              </FormField>

              {/* Inverse of the planned-payment drawer's "saldo påverkas inte"
                  callout: here we promise the *payment* is untouched. */}
              <div
                data-testid="debt-balance-callout"
                className={cn(
                  "flex items-start gap-3 rounded-2xl border border-eb-stroke/22",
                  "bg-[rgb(var(--eb-shell)/0.16)] px-4 py-3",
                )}
              >
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 flex-none text-eb-text/55"
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <p className="m-0 text-[12.5px] leading-relaxed text-eb-text/70">
                  <strong className="font-semibold text-eb-text">
                    {t("calloutTitle")}
                  </strong>{" "}
                  {t("calloutBody").replace("{payment}", paymentText)}
                </p>
              </div>

              <EditScopeRadioCards
                value={scope}
                onChange={handleScopeChange}
                monthLabel={monthLabel}
                canUpdatePlan={canUpdatePlan}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="debt-balance-modal-scope"
              />

              {error ? (
                <p
                  data-testid="debt-balance-error"
                  className="text-sm font-semibold text-red-500"
                >
                  {error}
                </p>
              ) : null}

              {!error && submitErrorMessage ? (
                <p
                  data-testid="debt-balance-submit-error"
                  className="text-sm font-semibold text-red-500"
                >
                  {submitErrorMessage}
                </p>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}

/**
 * Render a numeric value as a plain string suitable for `MoneyInput`. The
 * input formats display itself; we only need a clean seed without trailing
 * `.00` on whole numbers.
 */
function formatNumeric(value: number): string {
  return String(value);
}
