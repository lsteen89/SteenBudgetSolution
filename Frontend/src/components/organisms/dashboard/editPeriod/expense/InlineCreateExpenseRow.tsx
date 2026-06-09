import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  buildCreateExpenseItemApiSchema,
  buildCreateExpenseItemFormSchema,
  type CreateExpenseItemApiPayload,
  type CreateExpenseItemFormValues,
  type ExpenseItemSchemaMessages,
} from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import { createExpenseItemCardDict } from "@/utils/i18n/pages/private/dashboard/cards/period/CreateExpenseItemCard.i18n";
import { editPeriodDrawerDict } from "@/utils/i18n/pages/private/dashboard/cards/period/editPeriodDrawer.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";

/**
 * Minimal inline "add expense" form rendered inside an expense category group
 * in the Quick Edit drawer.
 *
 * The category is fixed by the parent group, so we deliberately do not render a
 * category picker — that would be redundant noise compared to the standalone
 * `CreateExpenseItemCard`. Created rows are always month-only (scope is decided
 * at the parent's create handler — quick edit writes the current month only).
 *
 * Subscription category rows get `subscriptionLifecycleStatus: "active"` so the
 * row starts in the same shape the backend would default to on its own.
 */
export type InlineCreateExpenseRowProps = {
  categoryId: string;
  categoryLabel: string;
  isSubscriptionCategory: boolean;
  onCreate: (payload: CreateExpenseItemApiPayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
};

type InlineFormValues = CreateExpenseItemFormValues;

const InlineCreateExpenseRow: React.FC<InlineCreateExpenseRowProps> = ({
  categoryId,
  categoryLabel,
  isSubscriptionCategory,
  onCreate,
  onCancel,
  isSaving = false,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof createExpenseItemCardDict.sv>(key: K) =>
    tDict(key, locale, createExpenseItemCardDict);
  const tDrawer = <K extends keyof typeof editPeriodDrawerDict.sv>(key: K) =>
    tDict(key, locale, editPeriodDrawerDict);
  const tSchema = <K extends keyof typeof expenseItemSchemaDict.sv>(key: K) =>
    tDict(key, locale, expenseItemSchemaDict);

  const schemaMessages = React.useMemo<ExpenseItemSchemaMessages>(
    () => ({
      invalidId: tSchema("invalidId"),
      nameRequired: tSchema("nameRequired"),
      nameTooLong: tSchema("nameTooLong"),
      categoryRequired: tSchema("categoryRequired"),
      amountRequired: tSchema("amountRequired"),
      amountInvalid: tSchema("amountInvalid"),
      amountNegative: tSchema("amountNegative"),
      atLeastOneItem: tSchema("atLeastOneItem"),
    }),
    [locale],
  );

  const formSchema = React.useMemo(
    () => buildCreateExpenseItemFormSchema(schemaMessages),
    [schemaMessages],
  );
  const apiSchema = React.useMemo(
    () => buildCreateExpenseItemApiSchema(schemaMessages),
    [schemaMessages],
  );

  const form = useForm<InlineFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId,
      amountMonthly: "",
      isActive: true,
      subscriptionLifecycleStatus: isSubscriptionCategory ? "active" : null,
    },
  });

  // Keep the pinned categoryId in sync if the parent re-mounts this form for
  // a different group without a full unmount. Defensive — today the parent
  // unmounts the form on cancel/submit, but we don't want to rely on that to
  // keep the pinned category honest.
  React.useEffect(() => {
    form.setValue("categoryId", categoryId);
    form.setValue(
      "subscriptionLifecycleStatus",
      isSubscriptionCategory ? "active" : null,
    );
  }, [categoryId, isSubscriptionCategory, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = apiSchema.parse(values);
    await onCreate(parsed);
  });

  return (
    <form
      onSubmit={handleSubmit}
      data-testid={`inline-create-expense-${categoryId}`}
      className="rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface p-4"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-eb-text/55">
        {tDrawer("inlineCreateHeading").replace("{category}", categoryLabel)}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_156px]">
        <div>
          <label className="sr-only" htmlFor={`inline-create-name-${categoryId}`}>
            {t("namePlaceholder")}
          </label>
          <input
            id={`inline-create-name-${categoryId}`}
            {...form.register("name")}
            placeholder={t("namePlaceholder")}
            className="h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          />
          {form.formState.errors.name ? (
            <p className="mt-1 text-xs font-medium text-wizard-warning">
              {form.formState.errors.name.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="sr-only"
            htmlFor={`inline-create-amount-${categoryId}`}
          >
            {t("amountPlaceholder")}
          </label>
          <MoneyInput
            id={`inline-create-amount-${categoryId}`}
            {...form.register("amountMonthly")}
            placeholder={t("amountPlaceholder")}
            className="h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-right text-sm tabular-nums text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          />
          {form.formState.errors.amountMonthly ? (
            <p className="mt-1 text-xs font-medium text-wizard-warning">
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
          {t("cancel")}
        </button>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex h-10 items-center justify-center rounded-2xl bg-eb-accent px-4 text-sm font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25 disabled:opacity-60"
        >
          {isSaving ? t("creating") : t("add")}
        </button>
      </div>
    </form>
  );
};

export default InlineCreateExpenseRow;
