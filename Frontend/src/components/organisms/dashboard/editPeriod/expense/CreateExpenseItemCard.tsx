import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { createExpenseItemCardDict } from "@/utils/i18n/pages/private/dashboard/cards/period/CreateExpenseItemCard.i18n";
import { tDict } from "@/utils/i18n/translate";
import React from "react";
import { useForm } from "react-hook-form";

type CategoryOption = {
  value: string;
  label: string;
};

type CreateExpenseItemForm = {
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
};

type CreateExpenseItemCardProps = {
  categories: CategoryOption[];
  onCreate: (values: CreateExpenseItemForm) => Promise<void>;
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

  const form = useForm<CreateExpenseItemForm>({
    defaultValues: {
      name: "",
      categoryId: categories[0]?.value ?? "",
      amountMonthly: 0,
      isActive: true,
    },
  });

  return (
    <form
      onSubmit={form.handleSubmit(onCreate)}
      className="rounded-2xl border border-dashed border-eb-stroke/40 bg-eb-surface p-4"
    >
      <div className="grid gap-3">
        <input
          {...form.register("name")}
          className="h-11 rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          placeholder={t("namePlaceholder")}
        />

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

        <input
          type="number"
          step="0.01"
          {...form.register("amountMonthly", { valueAsNumber: true })}
          className="h-11 rounded-2xl border border-eb-stroke/30 bg-eb-surface px-3 text-sm text-eb-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/25"
          placeholder={t("amountPlaceholder")}
        />

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
