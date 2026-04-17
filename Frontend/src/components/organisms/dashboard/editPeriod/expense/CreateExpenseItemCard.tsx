import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import {
  buildCreateExpenseItemApiSchema,
  buildCreateExpenseItemFormSchema,
  type CreateExpenseItemApiPayload,
  type CreateExpenseItemFormValues,
  type ExpenseItemSchemaMessages,
} from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import { createExpenseItemCardDict } from "@/utils/i18n/pages/private/dashboard/cards/period/CreateExpenseItemCard.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { zodResolver } from "@hookform/resolvers/zod";
import React from "react";
import { useForm } from "react-hook-form";

type CategoryOption = {
  value: string;
  label: string;
};

type CreateExpenseItemForm = CreateExpenseItemFormValues;

type CreateExpenseItemCardProps = {
  categories: CategoryOption[];
  onCreate: (values: CreateExpenseItemApiPayload) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
};

const CreateExpenseItemCard: React.FC<CreateExpenseItemCardProps> = ({
  categories,
  onCreate,
  onCancel,
  isSaving = false,
}) => {
  const locale = useAppLocale();

  const t = <K extends keyof typeof createExpenseItemCardDict.sv>(key: K) =>
    tDict(key, locale, createExpenseItemCardDict);
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

  const form = useForm<CreateExpenseItemForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      categoryId: categories[0]?.value ?? "",
      amountMonthly: "",
      isActive: true,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    const parsed = apiSchema.parse(values);
    await onCreate(parsed);
  });

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface p-4"
    >
      <div className="grid gap-3">
        <input
          {...form.register("name")}
          className="h-11 rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          placeholder={t("namePlaceholder")}
        />
        {form.formState.errors.name ? (
          <p className="text-xs font-medium text-wizard-warning">
            {form.formState.errors.name.message}
          </p>
        ) : null}

        <select
          {...form.register("categoryId")}
          className="h-11 rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
        >
          {categories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        {form.formState.errors.categoryId ? (
          <p className="text-xs font-medium text-wizard-warning">
            {form.formState.errors.categoryId.message}
          </p>
        ) : null}

        <input
          type="text"
          inputMode="decimal"
          {...form.register("amountMonthly", {
            onChange: (e) => {
              e.target.value = e.target.value.replace(/[^\d.,\s]/g, "");
            },
          })}
          className="h-11 rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          placeholder={t("amountPlaceholder")}
        />
        {form.formState.errors.amountMonthly ? (
          <p className="text-xs font-medium text-wizard-warning">
            {form.formState.errors.amountMonthly.message}
          </p>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-eb-text/75">
          <input type="checkbox" {...form.register("isActive")} />
          {t("activeInThisMonth")}
        </label>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm font-semibold text-eb-text/75 transition hover:bg-[rgb(var(--eb-shell)/0.45)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
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

export default CreateExpenseItemCard;
