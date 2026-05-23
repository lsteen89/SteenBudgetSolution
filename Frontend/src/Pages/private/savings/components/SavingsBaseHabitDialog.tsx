import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards, {
  type EditScopeRadioCardValue,
} from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { savingsEditorPageDict } from "@/utils/i18n/pages/private/savings/SavingsEditorPage.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { useEffect, useState, type FormEvent } from "react";

export type SavingsBaseHabitSavePayload = {
  amountMonthly: number;
  scope: EditScopeRadioCardValue;
};

type SavingsBaseHabitDialogProps = {
  open: boolean;
  /** Current base monthly savings, pre-fills the amount field on open. */
  baseMonthly: number;
  monthLabel: string;
  /**
   * True when the open month's BudgetMonthSavings row has no SourceSavingsId
   * (orphan). When true, the plan-scope cards render disabled and the scope
   * defaults to `currentMonthOnly`.
   */
  isMonthOnly?: boolean;
  isSaving?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSave: (payload: SavingsBaseHabitSavePayload) => void | Promise<void>;
};

/**
 * Editor for the steady base monthly savings amount. The three scopes mirror
 * the income / expense / debt / savings-goal handlers so the wiring is obvious
 * once a `Savings.MonthlySavings` endpoint exists. Until then the page treats
 * the save as a session-local placeholder (see MVP report).
 */
function formatNumberForInput(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export default function SavingsBaseHabitDialog({
  open,
  baseMonthly,
  monthLabel,
  isMonthOnly = false,
  isSaving = false,
  errorMessage = null,
  onClose,
  onSave,
}: SavingsBaseHabitDialogProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof savingsEditorPageDict.sv>(key: K) =>
    tDict(key, locale, savingsEditorPageDict);

  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState<EditScopeRadioCardValue>(
    "currentMonthAndBudgetPlan",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(formatNumberForInput(baseMonthly));
    setScope(isMonthOnly ? "currentMonthOnly" : "currentMonthAndBudgetPlan");
    setError(null);
  }, [open, baseMonthly, isMonthOnly]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isSaving) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isSaving, onClose]);

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseMoneyInput(amount, {
      allowNegative: false,
      maxDecimals: 2,
    });
    if (parsed === null) {
      setError(t("habitDialogAmountRequired"));
      return;
    }
    setError(null);
    await onSave({ amountMonthly: parsed, scope });
  };

  return (
    <div className="fixed inset-0 z-[90]">
      <button
        type="button"
        aria-label={t("habitDialogCloseAria")}
        onClick={isSaving ? undefined : onClose}
        disabled={isSaving}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-[560px]">
          <BudgetEntryModalShell
            titleId="savings-base-habit-title"
            descriptionId="savings-base-habit-description"
            eyebrow={t("habitDialogEyebrow")}
            title={t("habitDialogTitle")}
            context={monthLabel}
            description={t("habitDialogDescription")}
            closeAriaLabel={t("habitDialogCloseAria")}
            canClose={!isSaving}
            onClose={onClose}
            footer={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-[11.5px] text-eb-text/55">
                  {t("habitDialogFooterNote")}
                </span>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("habitDialogCancel")}
                  </button>
                  <CtaButton
                    type="submit"
                    form="savings-base-habit-form"
                    disabled={isSaving}
                    aria-busy={isSaving}
                    className="h-11"
                  >
                    {t("habitDialogSave")}
                  </CtaButton>
                </div>
              </div>
            }
          >
            <form
              id="savings-base-habit-form"
              onSubmit={submit}
              className="grid gap-4"
              noValidate
            >
              <FormField
                label={t("habitDialogAmountLabel")}
                htmlFor="savings-base-habit-amount"
                error={error ?? errorMessage ?? undefined}
                hint={
                  error || errorMessage ? undefined : t("habitDialogAmountHint")
                }
              >
                <MoneyInput
                  id="savings-base-habit-amount"
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isSaving}
                />
              </FormField>

              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={!isMonthOnly}
                disabled={isSaving}
                disabledPlanHint={t("habitDialogScopePlanDisabledHint")}
                testId="savings-base-habit-scope"
              />
            </form>
          </BudgetEntryModalShell>
        </div>
      </div>
    </div>
  );
}
