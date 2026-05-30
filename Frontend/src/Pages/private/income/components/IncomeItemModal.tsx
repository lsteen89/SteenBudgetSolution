import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import type {
  BudgetMonthIncomeItemEditorRowDto,
  BudgetMonthIncomeItemKind,
  IncomeEditScope,
} from "@/types/budget/BudgetMonthsStatusDto";
import { incomeItemModalDict } from "@/utils/i18n/pages/private/income/IncomeItemModal.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type IncomeItemModalProps = {
  open: boolean;
  mode: "create" | "edit";
  row: BudgetMonthIncomeItemEditorRowDto | null;
  monthLabel: string;
  isSaving?: boolean;
  /**
   * Optional kind to preselect when opening the create drawer. Used by the
   * per-group `Lägg till` button so a click on Sidoinkomst's add seeds the
   * selector with `sideHustle` instead of always defaulting to it. Ignored
   * in edit mode. PR 4 will use this same prop to hide the type selector
   * when group-add is used; PR 3 keeps the selector visible because the
   * presence-of-selector vs hidden-selector behavior is the drawer-redesign
   * scope. Without this prop, global add and group add submit identical
   * payloads — see the PR 3 review feedback.
   */
  presetKind?: Exclude<BudgetMonthIncomeItemKind, "salary"> | null;
  onClose: () => void;
  onSubmit: (values: {
    kind: Exclude<BudgetMonthIncomeItemKind, "salary">;
    name: string;
    amountMonthly: number;
    isActive: boolean;
    scope?: IncomeEditScope;
  }) => Promise<void>;
};

export default function IncomeItemModal({
  open,
  mode,
  row,
  monthLabel,
  isSaving = false,
  presetKind = null,
  onClose,
  onSubmit,
}: IncomeItemModalProps) {
  const locale = useAppLocale();
  const t = <K extends keyof typeof incomeItemModalDict.sv>(key: K) =>
    tDict(key, locale, incomeItemModalDict);

  const [kind, setKind] =
    useState<Exclude<BudgetMonthIncomeItemKind, "salary">>("sideHustle");
  const [name, setName] = useState("");
  const [amountMonthly, setAmountMonthly] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [scope, setScope] = useState<IncomeEditScope>("currentMonthOnly");
  const [error, setError] = useState<string | null>(null);

  const isSalary = mode === "edit" && row?.kind === "salary";
  const canUpdatePlan = row?.canUpdateDefault ?? false;

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && row) {
      setKind(row.kind === "householdMember" ? "householdMember" : "sideHustle");
      setName(row.name);
      setAmountMonthly(String(row.amountMonthly));
      setIsActive(row.isActive);
      setScope("currentMonthOnly");
      setError(null);
      return;
    }

    // Group add seeds `presetKind`; global add does not. Falling back to
    // `sideHustle` preserves the previous default for the hero CTA.
    setKind(presetKind ?? "sideHustle");
    setName("");
    setAmountMonthly("");
    setIsActive(true);
    setScope("currentMonthOnly");
    setError(null);
  }, [mode, open, row, presetKind]);

  const canClose = !isSaving;
  const title = mode === "create" ? t("titleCreate") : t("titleEdit");
  const parsedAmount = useMemo(
    () =>
      parseMoneyInput(amountMonthly, {
        allowNegative: false,
        maxDecimals: 2,
      }),
    [amountMonthly],
  );

  if (!open) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isSalary && name.trim().length === 0) {
      setError(t("nameRequired"));
      return;
    }

    if (parsedAmount === null) {
      setError(t("amountInvalid"));
      return;
    }

    await onSubmit({
      kind,
      name: isSalary ? row?.name ?? "Net salary" : name.trim(),
      amountMonthly: parsedAmount,
      isActive: isSalary ? true : isActive,
      scope: mode === "edit" ? scope : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[90]">
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
            titleId="income-item-modal-title"
            descriptionId="income-item-modal-description"
            eyebrow={t("eyebrow")}
            title={title}
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
                  form="income-item-form"
                  disabled={isSaving}
                  aria-busy={isSaving}
                  className="h-11"
                >
                  {isSaving
                    ? t("saving")
                    : mode === "create"
                      ? t("create")
                      : t("saveChanges")}
                </CtaButton>
              </div>
            }
          >
            <form
              id="income-item-form"
              onSubmit={submit}
              className="grid gap-3.5"
              noValidate
            >
              {mode === "create" ? (
                <FormField label={t("kindLabel")} htmlFor="income-kind">
                  <select
                    id="income-kind"
                    value={kind}
                    onChange={(event) =>
                      setKind(
                        event.target.value as Exclude<
                          BudgetMonthIncomeItemKind,
                          "salary"
                        >,
                      )
                    }
                    className="flex h-11 w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 text-sm text-eb-text outline-none transition focus:border-eb-stroke/40 focus:ring-2 focus:ring-[rgb(var(--eb-accent)/0.16)]"
                  >
                    <option value="sideHustle">{t("sideHustleOption")}</option>
                    <option value="householdMember">
                      {t("householdMemberOption")}
                    </option>
                  </select>
                </FormField>
              ) : null}

            {!isSalary ? (
              <FormField label={t("nameLabel")} htmlFor="income-name">
                <TextInput
                  id="income-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="off"
                />
              </FormField>
            ) : (
              <div className="rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.32)] px-4 py-3 text-sm text-eb-text/65">
                {t("salaryHint")}
              </div>
            )}

            <FormField label={t("amountLabel")} htmlFor="income-amount">
              <MoneyInput
                id="income-amount"
                value={amountMonthly}
                onChange={(event) => setAmountMonthly(event.target.value)}
              />
            </FormField>

            {!isSalary ? (
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((value) => !value)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                  isActive
                    ? "border-[rgb(var(--eb-accent)/0.24)] bg-[rgb(var(--eb-accent)/0.08)]"
                    : "border-amber-200/80 bg-amber-50/70",
                )}
              >
                <span className="text-sm font-semibold text-eb-text">
                  {t("activeLabel")}
                </span>
                <span
                  className={cn(
                    "relative inline-flex h-8 w-14 rounded-full border transition",
                    isActive
                      ? "border-[rgb(var(--eb-accent)/0.40)] bg-[rgb(var(--eb-accent)/0.34)]"
                      : "border-amber-300 bg-amber-200/90",
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(21,39,81,0.20)] transition-all",
                      isActive ? "left-7" : "left-1",
                    )}
                  />
                </span>
              </button>
            ) : null}

            {mode === "create" ? (
              <div className="rounded-2xl border border-eb-stroke/20 bg-[rgb(var(--eb-shell)/0.28)] px-4 py-3 text-sm text-eb-text/60">
                {t("monthOnlyCreate").replace("{month}", monthLabel)}
              </div>
            ) : (
              <EditScopeRadioCards
                value={scope}
                onChange={setScope}
                monthLabel={monthLabel}
                canUpdatePlan={canUpdatePlan}
                disabledPlanHint={t("scopePlanDisabledHint")}
                disabled={isSaving}
                testId="income-item-modal-scope-toggle"
              />
            )}

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
