import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { DebtEditScope } from "@/types/budget/BudgetMonthsStatusDto";
import type { DebtEditorRowDto } from "@/types/budget/DebtEditorDto";
import { debtDetailsModalDict } from "@/utils/i18n/pages/private/debts/DebtDetailsModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { useEffect, useState, type FormEvent } from "react";

const DEBT_TYPES = ["installment", "revolving", "bank_loan", "private"] as const;
type DebtTypeLiteral = (typeof DEBT_TYPES)[number];

export type DebtDetailsSubmitValues = {
  name: string;
  type: DebtTypeLiteral;
  apr: number;
  monthlyFee: number | null;
  minPayment: number | null;
  termMonths: number | null;
  monthlyPayment: number;
  scope: DebtEditScope;
};

type DebtDetailsModalProps = {
  open: boolean;
  row: DebtEditorRowDto | null;
  /** Display label for the open month (`maj 2026`). */
  monthLabel: string;
  isSaving?: boolean;
  /**
   * Backend error message surfaced from the most recent failed submit.
   * Parent owns the mutation; the modal renders the message without
   * knowing about React-Query.
   */
  submitErrorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: DebtDetailsSubmitValues) => Promise<void>;
};

/**
 * Debt PR 7 — `Redigera uppgifter` drawer. Wires the existing PR 2 backend
 * (`PATCH /api/budgets/months/{ym}/debt-items/{id}/details`).
 *
 * Balance is shown read-only in a facts strip with copy pointing to the
 * future PR 9 `Uppdatera saldo` flow — this drawer never moves the balance
 * value (matches the backend contract; the details endpoint does not
 * accept Balance).
 *
 * Plan-writing scopes (`currentMonthAndBudgetPlan` / `budgetPlanOnly`) are
 * disabled for month-only rows via `EditScopeRadioCards.canUpdatePlan`;
 * the read model's `actions.canUpdatePlan` is the source of truth (a
 * closed month sets every action flag false, so a stale local guess can
 * never leak a plan write).
 */
export default function DebtDetailsModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  submitErrorMessage = null,
  onClose,
  onSubmit,
}: DebtDetailsModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtDetailsModalDict.sv>(key: K) =>
    tDict(key, locale, debtDetailsModalDict);

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtTypeLiteral>("installment");
  const [apr, setApr] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [scope, setScope] = useState<DebtEditScope>("currentMonthOnly");
  const [error, setError] = useState<string | null>(null);

  // Seed local state from the row on every open. We use the row's
  // month-side values (the figures the user is currently looking at). The
  // source-side values are intentionally NOT used as the seed because the
  // editable surface is the month row — the scope cards control whether
  // the write fans out to the source.
  useEffect(() => {
    if (!open) return;
    if (!row) return;
    setName(row.name);
    setType(coerceType(row.type));
    setApr(formatNumeric(row.apr));
    setMonthlyFee(row.monthlyFee == null ? "" : formatNumeric(row.monthlyFee));
    setMinPayment(row.minPayment == null ? "" : formatNumeric(row.minPayment));
    setTermMonths(row.termMonths == null ? "" : String(row.termMonths));
    setMonthlyPayment(formatNumeric(row.monthlyPayment));
    setScope("currentMonthOnly");
    setError(null);
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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setError(t("nameRequired"));
      return;
    }
    if (trimmedName.length > 255) {
      setError(t("nameTooLong"));
      return;
    }

    if (!DEBT_TYPES.includes(type)) {
      setError(t("typeRequired"));
      return;
    }

    const parsedApr = parseMoneyInput(apr, {
      allowNegative: false,
      maxDecimals: 2,
    });
    if (parsedApr === null) {
      setError(t("aprInvalid"));
      return;
    }

    let parsedMonthlyFee: number | null = null;
    if (monthlyFee.trim() !== "") {
      const f = parseMoneyInput(monthlyFee, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (f === null) {
        setError(t("monthlyFeeInvalid"));
        return;
      }
      parsedMonthlyFee = f;
    }

    let parsedMinPayment: number | null = null;
    if (minPayment.trim() !== "") {
      const m = parseMoneyInput(minPayment, {
        allowNegative: false,
        maxDecimals: 2,
      });
      if (m === null) {
        setError(t("minPaymentInvalid"));
        return;
      }
      parsedMinPayment = m;
    }

    if (type === "revolving" && (parsedMinPayment === null || parsedMinPayment < 1)) {
      setError(t("minPaymentRequiredRevolving"));
      return;
    }

    let parsedTerm: number | null = null;
    if (termMonths.trim() !== "") {
      const n = Number.parseInt(termMonths.trim(), 10);
      if (!Number.isFinite(n) || n < 1) {
        setError(t("termInvalid"));
        return;
      }
      parsedTerm = n;
    }

    if ((type === "installment" || type === "bank_loan") && parsedTerm === null) {
      setError(t("termRequiredInstallment"));
      return;
    }

    const parsedPayment = parseMoneyInput(monthlyPayment, {
      allowNegative: false,
      maxDecimals: 2,
    });
    if (parsedPayment === null) {
      setError(t("paymentInvalid"));
      return;
    }

    // Defensive narrow — the read model is already authoritative, but if
    // the row says we can't update the plan we never let the user's chosen
    // scope leak a plan-write through the wire.
    const safeScope: DebtEditScope = canUpdatePlan ? scope : "currentMonthOnly";

    setError(null);
    await onSubmit({
      name: trimmedName,
      type,
      apr: parsedApr,
      monthlyFee: parsedMonthlyFee,
      minPayment: parsedMinPayment,
      termMonths: parsedTerm,
      monthlyPayment: parsedPayment,
      scope: safeScope,
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
            titleId="debt-details-modal-title"
            descriptionId="debt-details-modal-description"
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
                  form="debt-details-form"
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
              id="debt-details-form"
              data-testid="debt-details-form"
              onSubmit={submit}
              className="grid gap-4"
              noValidate
            >
              <section
                data-testid="debt-details-facts"
                className="rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.18)] px-4 py-3"
              >
                <div className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55">
                  {t("legendFacts")}
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-eb-text/65">
                    {t("factsBalanceLabel")}
                  </span>
                  <strong
                    data-testid="debt-details-facts-balance"
                    className="text-[15px] font-extrabold tabular-nums text-eb-text"
                  >
                    {balanceText}
                  </strong>
                </div>
                <p className="mt-1 text-[12px] text-eb-text/55">
                  {t("factsBalanceHint")}
                </p>
              </section>

              <div className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55">
                {t("legendDetails")}
              </div>

              <FormField label={t("nameLabel")} htmlFor="debt-details-name">
                <TextInput
                  id="debt-details-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("namePlaceholder")}
                  autoComplete="off"
                  maxLength={255}
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("typeLabel")} htmlFor="debt-details-type">
                  <select
                    id="debt-details-type"
                    data-testid="debt-details-type"
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as DebtTypeLiteral)
                    }
                    className="flex h-11 w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 text-sm text-eb-text outline-none transition focus:border-eb-stroke/40 focus:ring-2 focus:ring-[rgb(var(--eb-accent)/0.16)]"
                  >
                    <option value="installment">{t("typeInstallment")}</option>
                    <option value="revolving">{t("typeRevolving")}</option>
                    <option value="bank_loan">{t("typeBankLoan")}</option>
                    <option value="private">{t("typePrivate")}</option>
                  </select>
                </FormField>

                <FormField label={t("aprLabel")} htmlFor="debt-details-apr">
                  <MoneyInput
                    id="debt-details-apr"
                    value={apr}
                    onChange={(event) => setApr(event.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label={t("monthlyFeeLabel")}
                  htmlFor="debt-details-fee"
                  hint={t("monthlyFeeOptional")}
                >
                  <MoneyInput
                    id="debt-details-fee"
                    value={monthlyFee}
                    onChange={(event) => setMonthlyFee(event.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("minPaymentLabel")}
                  htmlFor="debt-details-min"
                  hint={type === "revolving" ? t("minPaymentHint") : undefined}
                >
                  <MoneyInput
                    id="debt-details-min"
                    value={minPayment}
                    onChange={(event) => setMinPayment(event.target.value)}
                  />
                </FormField>
              </div>

              <FormField
                label={t("termMonthsLabel")}
                htmlFor="debt-details-term"
                hint={
                  type === "installment" || type === "bank_loan"
                    ? t("termMonthsHint")
                    : undefined
                }
              >
                <TextInput
                  id="debt-details-term"
                  inputMode="numeric"
                  value={termMonths}
                  onChange={(event) =>
                    setTermMonths(event.target.value.replace(/[^\d]/g, ""))
                  }
                  placeholder="0"
                  aria-label={`${t("termMonthsLabel")} (${t("termMonthsSuffix")})`}
                />
              </FormField>

              <FormField
                label={t("paymentLabel")}
                htmlFor="debt-details-payment"
                hint={t("paymentHint")}
              >
                <MoneyInput
                  id="debt-details-payment"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                />
              </FormField>

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={canUpdatePlan}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="debt-details-modal-scope"
              />

              {error ? (
                <p
                  data-testid="debt-details-error"
                  className="text-sm font-semibold text-red-500"
                >
                  {error}
                </p>
              ) : null}

              {!error && submitErrorMessage ? (
                <p
                  data-testid="debt-details-submit-error"
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
 * Coerce an arbitrary backend type string into the literal union our select
 * supports. Unknown values fall back to `installment` so the select always
 * has a valid selected option — the backend validator still rejects bogus
 * types on submit, so this is a defensive UI fallback only.
 */
function coerceType(value: string): DebtTypeLiteral {
  const lowered = value?.toLowerCase();
  if (lowered === "revolving") return "revolving";
  if (lowered === "bank_loan") return "bank_loan";
  if (lowered === "private") return "private";
  return "installment";
}

/**
 * Render a numeric value as a plain string suitable for `MoneyInput`. Zero
 * decimals when the value is a whole number so the input doesn't show
 * `1500.00` for a freshly-seeded integer planned payment.
 */
function formatNumeric(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return String(value);
}
