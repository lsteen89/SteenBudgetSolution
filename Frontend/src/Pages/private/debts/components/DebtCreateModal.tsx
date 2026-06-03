import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import EditorPreviewCard from "@/components/molecules/forms/budgetEditor/EditorPreviewCard";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type { DebtCreateScope } from "@/types/budget/BudgetMonthsStatusDto";
import { debtCreateModalDict } from "@/utils/i18n/pages/private/debts/DebtCreateModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { calcDebtPaymentBreakdown } from "../utils/debtPaymentBreakdown";
import DebtPaymentPreviewBody from "./DebtPaymentPreviewBody";

// Backend type literals (`Backend/Application/Constants/DebtTypes.cs`). Kept
// as a local constant union so the select can't drift from what the
// `CreateBudgetMonthDebtCommandValidator` accepts.
const DEBT_TYPES = ["installment", "revolving", "bank_loan", "private"] as const;
type DebtTypeLiteral = (typeof DEBT_TYPES)[number];

export type DebtCreateSubmitValues = {
  name: string;
  type: DebtTypeLiteral;
  balance: number;
  apr: number;
  monthlyFee: number | null;
  minPayment: number | null;
  termMonths: number | null;
  monthlyPayment: number;
  scope: DebtCreateScope;
};

type DebtCreateModalProps = {
  open: boolean;
  /** Display label for the open month (`maj 2026`). */
  monthLabel: string;
  isSaving?: boolean;
  /**
   * Backend error message surfaced from the most recent failed submit. The
   * parent owns the mutation; passing the message down keeps the modal
   * stateless about the API and lets the parent invalidate / refetch on
   * success without the modal having to know about React-Query.
   */
  submitErrorMessage?: string | null;
  onClose: () => void;
  onSubmit: (values: DebtCreateSubmitValues) => Promise<void>;
};

/**
 * Debt PR 7 — `Lägg till skuld` drawer. Wires the existing PR 2 backend
 * (`POST /api/budgets/months/{ym}/debt-items`). The drawer is stateless
 * about networking: the parent owns the mutation, toast, and query
 * invalidation. The modal handles validation, the scope cards, and
 * surfacing backend errors when they come back via `submitErrorMessage`.
 *
 * Default scope is `currentMonthAndBudgetPlan` to match the design handover
 * recommendation (most debts are recurring; the user has to explicitly
 * narrow to month-only or future-plan-only). Plan-writing scopes ARE
 * allowed for create — unlike income's create, debt's PR 2 backend accepts
 * all three scopes.
 */
export default function DebtCreateModal({
  open,
  monthLabel,
  isSaving = false,
  submitErrorMessage = null,
  onClose,
  onSubmit,
}: DebtCreateModalProps) {
  const locale = useAppLocale();
  const currency = useAppCurrency();
  const t = <K extends keyof typeof debtCreateModalDict.sv>(key: K) =>
    tDict(key, locale, debtCreateModalDict);

  const [name, setName] = useState("");
  const [type, setType] = useState<DebtTypeLiteral>("installment");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [termMonths, setTermMonths] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [scope, setScope] = useState<DebtCreateScope>(
    "currentMonthAndBudgetPlan",
  );
  const [error, setError] = useState<string | null>(null);

  // Reset state on every open — never leak the last failed submit into a
  // fresh open. The parent's mutation reset is independent (it clears its
  // own error on the next mutate call).
  useEffect(() => {
    if (!open) return;
    setName("");
    setType("installment");
    setBalance("");
    setApr("");
    setMonthlyFee("");
    setMinPayment("");
    setTermMonths("");
    setMonthlyPayment("");
    setScope("currentMonthAndBudgetPlan");
    setError(null);
  }, [open]);

  // Close on Escape — matches the income modal's UX. Disabled while saving
  // so a mid-flight close doesn't leave the request dangling visually.
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

  // Debt Polish PR 2: dirty-form preview. Parse the in-flight inputs with the
  // same `parseMoneyInput` the submit handler uses so the preview shows the
  // same number the backend will receive. Invalid / blank inputs degrade to 0
  // — that lets the breakdown surface render calmly while the user is still
  // typing instead of disappearing the moment they erase a digit.
  const previewBreakdown = useMemo(() => {
    const safeBalance =
      parseMoneyInput(balance, { allowNegative: false, maxDecimals: 2 }) ?? 0;
    const safeApr =
      parseMoneyInput(apr, { allowNegative: false, maxDecimals: 2 }) ?? 0;
    const safeFee =
      monthlyFee.trim() === ""
        ? null
        : parseMoneyInput(monthlyFee, {
            allowNegative: false,
            maxDecimals: 2,
          });
    const safePayment =
      parseMoneyInput(monthlyPayment, {
        allowNegative: false,
        maxDecimals: 2,
      }) ?? 0;

    return calcDebtPaymentBreakdown({
      currentBalance: safeBalance,
      annualInterestPercent: safeApr,
      monthlyFee: safeFee,
      plannedMonthlyPayment: safePayment,
    });
  }, [balance, apr, monthlyFee, monthlyPayment]);

  const formatPreviewAmount = (value: number) =>
    formatMoneyV2(value, currency, locale, { fractionDigits: 0 });

  if (!open) return null;

  const canClose = !isSaving;

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

    const parsedBalance = parseMoneyInput(balance, {
      allowNegative: false,
      maxDecimals: 2,
    });
    if (parsedBalance === null) {
      setError(t("balanceInvalid"));
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

    // Cross-field rule (matches `CreateBudgetMonthDebtCommandValidator`):
    // revolving requires MinPayment >= 1.
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

    // Cross-field rule: installment / bank_loan require TermMonths >= 1.
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

    setError(null);
    await onSubmit({
      name: trimmedName,
      type,
      balance: parsedBalance,
      apr: parsedApr,
      monthlyFee: parsedMonthlyFee,
      minPayment: parsedMinPayment,
      termMonths: parsedTerm,
      monthlyPayment: parsedPayment,
      scope,
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
            titleId="debt-create-modal-title"
            descriptionId="debt-create-modal-description"
            eyebrow={t("eyebrow")}
            title={t("title")}
            context={monthLabel}
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
                  form="debt-create-form"
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
              id="debt-create-form"
              data-testid="debt-create-form"
              onSubmit={submit}
              className="grid gap-4"
              noValidate
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-eb-text/55">
                {t("legendDetails")}
              </div>

              <FormField label={t("nameLabel")} htmlFor="debt-create-name">
                <TextInput
                  id="debt-create-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("namePlaceholder")}
                  autoComplete="off"
                  maxLength={255}
                />
              </FormField>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("typeLabel")} htmlFor="debt-create-type">
                  <select
                    id="debt-create-type"
                    data-testid="debt-create-type"
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

                <FormField
                  label={t("balanceLabel")}
                  htmlFor="debt-create-balance"
                  hint={t("balanceHint")}
                >
                  <MoneyInput
                    id="debt-create-balance"
                    value={balance}
                    onChange={(event) => setBalance(event.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label={t("aprLabel")} htmlFor="debt-create-apr">
                  <MoneyInput
                    id="debt-create-apr"
                    value={apr}
                    onChange={(event) => setApr(event.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("monthlyFeeLabel")}
                  htmlFor="debt-create-fee"
                  hint={t("monthlyFeeOptional")}
                >
                  <MoneyInput
                    id="debt-create-fee"
                    value={monthlyFee}
                    onChange={(event) => setMonthlyFee(event.target.value)}
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  label={t("minPaymentLabel")}
                  htmlFor="debt-create-min"
                  hint={type === "revolving" ? t("minPaymentHint") : undefined}
                >
                  <MoneyInput
                    id="debt-create-min"
                    value={minPayment}
                    onChange={(event) => setMinPayment(event.target.value)}
                  />
                </FormField>
                <FormField
                  label={t("termMonthsLabel")}
                  htmlFor="debt-create-term"
                  hint={
                    type === "installment" || type === "bank_loan"
                      ? t("termMonthsHint")
                      : undefined
                  }
                >
                  <TextInput
                    id="debt-create-term"
                    inputMode="numeric"
                    value={termMonths}
                    onChange={(event) =>
                      setTermMonths(event.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="0"
                    aria-label={`${t("termMonthsLabel")} (${t("termMonthsSuffix")})`}
                  />
                </FormField>
              </div>

              <FormField
                label={t("paymentLabel")}
                htmlFor="debt-create-payment"
                hint={t("paymentHint")}
              >
                <MoneyInput
                  id="debt-create-payment"
                  value={monthlyPayment}
                  onChange={(event) => setMonthlyPayment(event.target.value)}
                />
              </FormField>

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan
                disabled={isSaving}
                testId="debt-create-modal-scope"
              />

              {scope === "currentMonthOnly" ? (
                <div
                  data-testid="debt-create-month-only-callout"
                  className={cn(
                    "rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.24)] px-3.5 py-2.5 text-[12.5px] text-eb-text/75",
                  )}
                >
                  {t("monthOnlyCallout")}
                </div>
              ) : null}

              {/* Debt Polish PR 2: dirty-form preview. Uses the FE mirror of
                  the PR 1 backend formula (`utils/debtPaymentBreakdown.ts`)
                  so the user sees how APR / fee / payment changes split the
                  planned monthly payment before they save. `muted=true` when
                  the payment cannot cover interest + fee — the same amber
                  treatment the row breakdown uses for the live read model.

                  Under `budgetPlanOnly` no current-month row is created, so
                  the label / subtitle / projected-after copy switches to the
                  plan-aware variants — otherwise a user picking "Budget plan
                  forward only" would see "this month" copy that the save
                  will not actually produce. */}
              <EditorPreviewCard
                label={
                  scope === "budgetPlanOnly"
                    ? t("previewLabelPlanOnly")
                    : t("previewLabel")
                }
                title={name.trim() || t("previewUntitled")}
                subtitle={
                  scope === "budgetPlanOnly"
                    ? t("previewSubtitlePlanOnly")
                    : t("previewSubtitle")
                }
                amount={formatPreviewAmount(
                  previewBreakdown.plannedMonthlyPayment,
                )}
                status={t("previewPlannedPaymentLabel")}
                muted={!previewBreakdown.coversInterestAndFees}
              >
                <DebtPaymentPreviewBody
                  breakdown={previewBreakdown}
                  formatAmount={formatPreviewAmount}
                  testIdPrefix="debt-create-preview"
                  labels={{
                    interestLabel: t("previewInterestLabel"),
                    feeLabel: t("previewFeeLabel"),
                    principalLabel: t("previewPrincipalLabel"),
                    projectedAfterLabel:
                      scope === "budgetPlanOnly"
                        ? t("previewProjectedAfterLabelPlanOnly")
                        : t("previewProjectedAfterLabel"),
                    balanceUnchangedNote: t("previewBalanceUnchangedNote"),
                    shortfallAdvisory: t("previewShortfallAdvisory"),
                    shortfallAmountTemplate: t("previewShortfallAmount"),
                  }}
                />
              </EditorPreviewCard>

              {error ? (
                <p
                  data-testid="debt-create-error"
                  className="text-sm font-semibold text-red-500"
                >
                  {error}
                </p>
              ) : null}

              {!error && submitErrorMessage ? (
                <p
                  data-testid="debt-create-submit-error"
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
