import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import type { CreateBudgetMonthIncomeItemRequestDto } from "@/types/budget/BudgetMonthsStatusDto";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { tDict } from "@/utils/i18n/translate";
import { moneyInputSchema } from "@/utils/forms/zodMoney";
import { parseMoneyInput } from "@/utils/money/moneyInput";

/**
 * Minimal inline "add income" form rendered inside the `householdMember` and
 * `sideHustle` groups of the Quick Edit drawer.
 *
 * The group's `kind` is fixed by the parent — there is no kind picker. Salary
 * never receives an inline create affordance because the backend rejects
 * `kind: "salary"` on the create endpoint and only allows one salary row per
 * budget month.
 *
 * Created rows are always month-only. The parent's `onCreate` handler is
 * responsible for the API call and is expected to send the row with
 * `isActive: true` and `scope: "currentMonthOnly"` so the new row joins the
 * group's active total immediately.
 */
export type InlineCreateIncomeRowKind = "householdMember" | "sideHustle";

export type InlineCreateIncomePayload = Pick<
  CreateBudgetMonthIncomeItemRequestDto,
  "kind" | "name" | "amountMonthly" | "isActive"
>;

export type InlineCreateIncomeRowProps = {
  kind: InlineCreateIncomeRowKind;
  groupLabel: string;
  onCreate: (payload: InlineCreateIncomePayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
};

const InlineCreateIncomeRow: React.FC<InlineCreateIncomeRowProps> = ({
  kind,
  groupLabel,
  onCreate,
  onCancel,
  isSaving = false,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);

  const formSchema = React.useMemo(
    () =>
      z.object({
        name: z
          .string()
          .trim()
          .min(1, t("incomeNameRequired"))
          .max(120, t("incomeNameTooLong")),
        amountMonthly: moneyInputSchema({
          requiredMessage: t("amountRequired"),
          invalidMessage: t("amountInvalid"),
          allowNegative: false,
          maxDecimals: 2,
        }),
      }),
    // We rebuild the schema when the locale flips so error messages stay
    // localised. `t` itself is stable per render; tracking `locale` is the
    // honest dependency.
    [locale],
  );

  const form = useForm<{ name: string; amountMonthly: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", amountMonthly: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsedAmount = parseMoneyInput(values.amountMonthly, {
      allowNegative: false,
      maxDecimals: 2,
    });
    // Zod already validated; this is defence-in-depth. If the parser ever
    // disagrees with the schema, the user sees the localised "invalid amount"
    // copy on the next pass rather than a silent NaN landing on the wire.
    if (parsedAmount === null) {
      form.setError("amountMonthly", { message: t("amountInvalid") });
      return;
    }

    await onCreate({
      kind,
      name: values.name.trim(),
      amountMonthly: parsedAmount,
      // Inline-created rows always start active. An immediately-inactive row
      // would be invisible to the dashboard total and confuse the user about
      // why the projection didn't move.
      isActive: true,
    });
  });

  return (
    <form
      onSubmit={handleSubmit}
      data-testid={`inline-create-income-${kind}`}
      className="rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface p-4"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-eb-text/55">
        {t("incomeInlineCreateHeading").replace("{category}", groupLabel)}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_156px]">
        <div>
          <label
            className="sr-only"
            htmlFor={`inline-create-income-name-${kind}`}
          >
            {t("incomeInlineCreateNamePlaceholder")}
          </label>
          <input
            id={`inline-create-income-name-${kind}`}
            {...form.register("name")}
            placeholder={t("incomeInlineCreateNamePlaceholder")}
            className="h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs font-medium text-eb-danger">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="sr-only"
            htmlFor={`inline-create-income-amount-${kind}`}
          >
            {t("incomeInlineCreateAmountPlaceholder")}
          </label>
          <MoneyInput
            id={`inline-create-income-amount-${kind}`}
            {...form.register("amountMonthly")}
            placeholder={t("incomeInlineCreateAmountPlaceholder")}
            className="h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-right text-sm tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          />
          {form.formState.errors.amountMonthly ? (
            <p className="mt-1 text-xs font-medium text-eb-danger">
              {form.formState.errors.amountMonthly.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm font-semibold text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:opacity-60"
        >
          {t("incomeInlineCreateCancel")}
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-eb-accent px-4 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:opacity-60"
        >
          {isSaving
            ? t("incomeInlineCreateSaving")
            : t("incomeInlineCreateSubmit")}
        </button>
      </div>
    </form>
  );
};

export default InlineCreateIncomeRow;
