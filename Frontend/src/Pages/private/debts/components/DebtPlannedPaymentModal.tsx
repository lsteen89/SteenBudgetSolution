import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type {
  BudgetMonthDebtEditorRowDto,
  DebtEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import { debtPlannedPaymentModalDict } from "@/utils/i18n/pages/private/debts/DebtPlannedPaymentModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type DebtPlannedPaymentModalProps = {
  open: boolean;
  row: BudgetMonthDebtEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    monthlyPayment: number;
    scope: DebtEditScope;
  }) => Promise<void>;
};

export default function DebtPlannedPaymentModal({
  open,
  row,
  monthLabel,
  isSaving = false,
  onClose,
  onSubmit,
}: DebtPlannedPaymentModalProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof debtPlannedPaymentModalDict.sv>(key: K) =>
    tDict(key, locale, debtPlannedPaymentModalDict);

  const [amountMonthly, setAmountMonthly] = useState("");
  const [scope, setScope] = useState<DebtEditScope>("currentMonthOnly");
  const [error, setError] = useState<string | null>(null);

  const canUpdatePlan = row?.canUpdateDefault ?? false;

  useEffect(() => {
    if (!open) return;
    if (!row) return;

    setAmountMonthly(String(row.monthlyPayment));
    setScope("currentMonthOnly");
    setError(null);
  }, [open, row]);

  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amountMonthly],
  );

  if (!open || !row) return null;

  const canClose = !isSaving;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (parsedAmount === null) {
      setError(t("amountInvalid"));
      return;
    }

    await onSubmit({
      monthlyPayment: parsedAmount,
      scope,
    });
  };

  return (
    <div className="fixed inset-0 z-[90]" data-testid="debt-planned-payment-modal">
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
            titleId="debt-modal-title"
            descriptionId="debt-modal-description"
            eyebrow={t("eyebrow")}
            title={t("titleEdit")}
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
                  form="debt-planned-payment-form"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-11"
                >
                  {isSaving ? t("saving") : t("saveChanges")}
                </CtaButton>
              </div>
            }
          >
            <form
              id="debt-planned-payment-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              <FormField label={t("amountLabel")} htmlFor="debt-amount">
                <MoneyInput
                  id="debt-amount"
                  value={amountMonthly}
                  onChange={(event) => setAmountMonthly(event.target.value)}
                />
              </FormField>

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={canUpdatePlan}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="debt-modal-scope-toggle"
              />

              {error ? (
                <p className="text-sm font-semibold text-red-500">{error}</p>
              ) : null}
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}
