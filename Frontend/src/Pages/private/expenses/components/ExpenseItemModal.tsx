import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import InfoBox from "@/components/molecules/messaging/InfoBox";
import { useAppCurrency } from "@/hooks/i18n/useAppCurrency";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import {
  buildCreateExpenseItemApiSchema,
  buildCreateExpenseItemFormSchema,
  type CreateExpenseItemApiPayload,
  type CreateExpenseItemFormValues,
  type ExpenseItemSchemaMessages,
} from "@/schemas/dashboard/monthEditor/expenseItem.schemas";
import type { ExpenseCategoryDto } from "@/types/budget/ExpenseCategoryDto";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { expenseItemModalDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemModal.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput, sanitizeMoneyInput } from "@/utils/money/moneyInput";
import { formatMoneyV2 } from "@/utils/money/moneyV2";
import { zodResolver } from "@hookform/resolvers/zod";
import { Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { ZodError } from "zod";

type ExpenseItemModalMode = "create" | "edit";

export type ExpenseItemFormValues = CreateExpenseItemFormValues;

type ExpenseItemModalRow = {
  id: string;
  name: string;
  categoryId: string;
  amountMonthly: number;
  isActive: boolean;
};

type ExpenseItemModalProps = {
  open: boolean;
  mode: ExpenseItemModalMode;
  row: ExpenseItemModalRow | null;
  categories: ExpenseCategoryDto[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (values: CreateExpenseItemApiPayload) => Promise<void>;
};

export default function ExpenseItemModal({
  open,
  mode,
  row,
  categories,
  isSaving = false,
  onClose,
  onSubmit,
}: ExpenseItemModalProps) {
  const currency = useAppCurrency();
  const appLocale = useAppLocale();
  const t = <K extends keyof typeof expenseItemModalDict.sv>(key: K) =>
    tDict(key, appLocale, expenseItemModalDict);
  const tSchema = <K extends keyof typeof expenseItemSchemaDict.sv>(key: K) =>
    tDict(key, appLocale, expenseItemSchemaDict);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const defaultCategoryId = categories[0]?.id ?? "";
  const canClose = !isSaving;
  const schemaMessages = useMemo<ExpenseItemSchemaMessages>(
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
    [appLocale],
  );
  const formSchema = useMemo(
    () => buildCreateExpenseItemFormSchema(schemaMessages),
    [schemaMessages],
  );
  const apiSchema = useMemo(
    () => buildCreateExpenseItemApiSchema(schemaMessages),
    [schemaMessages],
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
    setValue,
    clearErrors,
    setError,
  } = useForm<CreateExpenseItemFormValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
    shouldFocusError: true,
    defaultValues: {
      name: "",
      categoryId: defaultCategoryId,
      amountMonthly: "",
      isActive: true,
    },
  });
  const handleRequestClose = () => {
    if (!canClose) return;

    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }

    onClose();
  };
  const handleConfirmDiscard = () => {
    setShowDiscardConfirm(false);
    onClose();
  };

  const handleKeepEditing = () => {
    setShowDiscardConfirm(false);
  };

  useEffect(() => {
    if (!open) return;

    previousActiveElementRef.current =
      document.activeElement as HTMLElement | null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
      previousActiveElementRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && row) {
      reset({
        name: row.name,
        categoryId: row.categoryId,
        amountMonthly: String(row.amountMonthly),
        isActive: row.isActive,
      });
      return;
    }

    reset({
      name: "",
      categoryId: defaultCategoryId,
      amountMonthly: "",
      isActive: true,
    });
  }, [open, mode, row, reset, defaultCategoryId]);

  const nameError = errors.name?.message?.toString();
  const categoryError = errors.categoryId?.message?.toString();
  const amountError = errors.amountMonthly?.message?.toString();

  const selectedCategoryId = watch("categoryId");
  const watchedName = watch("name");
  const watchedAmount = watch("amountMonthly");
  const watchedIsActive = watch("isActive");
  const normalizedAmount =
    parseMoneyInput(watchedAmount, {
      allowNegative: false,
      maxDecimals: 2,
    }) ?? 0;
  const nameField = register("name");
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const statusInfo = watchedIsActive ? t("activeInfo") : t("inactiveInfo");
  const submitForm = handleSubmit(
    async (values) => {
      await onSubmit(apiSchema.parse(values));
    },
    () => {},
  );

  const submitHandler = async (event: FormEvent<HTMLFormElement>) => {
    try {
      await submitForm(event);
    } catch (error) {
      if (!(error instanceof ZodError)) {
        throw error;
      }

      clearErrors(["name", "categoryId", "amountMonthly", "isActive"]);

      for (const issue of error.issues) {
        const field = issue.path[0];

        if (
          field === "name" ||
          field === "categoryId" ||
          field === "amountMonthly" ||
          field === "isActive"
        ) {
          setError(field, {
            type: "manual",
            message: issue.message,
          });
        }
      }
    }
  };

  const selectedCategoryLabel = useMemo(() => {
    const category = categories.find((x) => x.id === selectedCategoryId);
    if (!category) return "—";

    return labelCategory(asCategoryKey(category.code), appLocale);
  }, [appLocale, categories, selectedCategoryId]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      handleRequestClose();
      return;
    }

    if (event.key !== "Tab" || !dialogRef.current) return;

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  useEffect(() => {
    setShowStatusInfo(false);
  }, [watchedIsActive]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90]" onKeyDown={handleKeyDown}>
      <button
        type="button"
        aria-label={t("closeAriaLabel")}
        onClick={handleRequestClose}
        disabled={!canClose}
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(21,39,81,0.18),rgba(21,39,81,0.52))]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-item-modal-title"
          aria-describedby="expense-item-modal-description"
          className="relative w-full max-w-xl rounded-[2rem] border border-eb-stroke/25 bg-[rgb(var(--eb-shell))] shadow-[0_16px_60px_rgba(21,39,81,0.16)]"
        >
          <div className="rounded-[2rem] bg-eb-surface">
            <div className="flex items-start justify-between gap-4 border-b border-eb-stroke/20 px-7 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-eb-text/45">
                  {t("eyebrow")}
                </p>
                <h2
                  id="expense-item-modal-title"
                  className="mt-1 text-[1.9rem] font-black tracking-tight text-eb-text"
                >
                  {mode === "create" ? t("titleCreate") : t("titleEdit")}
                </h2>
                <p
                  id="expense-item-modal-description"
                  className="mt-1 text-sm text-eb-text/60"
                >
                  {t("description")}
                </p>
              </div>

              <button
                type="button"
                onClick={handleRequestClose}
                disabled={!canClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 text-eb-text/65 transition hover:bg-[rgb(var(--eb-shell)/0.42)] hover:text-eb-text disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={t("closeAriaLabel")}
              >
                ×
              </button>
            </div>

            <form onSubmit={submitHandler} className="px-6 py-5" noValidate>
              <div className="grid gap-3.5">
                <FormField
                  label={t("nameLabel")}
                  htmlFor="expense-name"
                  error={nameError}
                >
                  <TextInput
                    id="expense-name"
                    autoComplete="off"
                    aria-invalid={!!errors.name}
                    {...nameField}
                    ref={(element) => {
                      nameField.ref(element);
                      nameInputRef.current = element;
                    }}
                  />
                </FormField>

                <FormField
                  label={t("categoryLabel")}
                  htmlFor="expense-category"
                  error={categoryError}
                >
                  <select
                    id="expense-category"
                    aria-invalid={!!errors.categoryId}
                    className={cn(
                      "flex h-11 w-full rounded-2xl border border-eb-stroke/25 bg-eb-surface px-4 text-sm text-eb-text outline-none transition",
                      "focus:border-eb-stroke/40 focus:ring-2 focus:ring-[rgb(var(--eb-accent)/0.16)]",
                    )}
                    {...register("categoryId")}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {labelCategory(asCategoryKey(category.code), appLocale)}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label={t("amountLabel")}
                  htmlFor="expense-amount"
                  error={amountError}
                >
                  <TextInput
                    id="expense-amount"
                    type="text"
                    inputMode="decimal"
                    aria-invalid={!!amountError}
                    className="text-right font-semibold tabular-nums"
                    {...register("amountMonthly", {
                      onChange: (e) => {
                        e.target.value = sanitizeMoneyInput(e.target.value);
                      },
                    })}
                  />
                </FormField>

                <div
                  className={cn(
                    "rounded-2xl border px-4 py-4 transition-colors",
                    watchedIsActive
                      ? "border-[rgb(var(--eb-accent)/0.24)] bg-[rgb(var(--eb-accent)/0.08)]"
                      : "border-amber-200/80 bg-amber-50/70",
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-eb-text">
                            {t("activeLabel")}
                          </div>

                          <button
                            type="button"
                            aria-label={t("statusInfoAriaLabel")}
                            aria-expanded={showStatusInfo}
                            onClick={() => setShowStatusInfo((v) => !v)}
                            className={cn(
                              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                              "border border-eb-stroke/25 text-eb-text/55 transition",
                              "hover:bg-[rgb(var(--eb-shell)/0.35)] hover:text-eb-text",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.20)]",
                            )}
                          >
                            <Info className="h-3 w-3" />
                          </button>
                        </div>

                        <div
                          className={cn(
                            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            watchedIsActive
                              ? "bg-[rgb(var(--eb-accent)/0.12)] text-[rgb(var(--eb-accent))]"
                              : "border border-amber-200 bg-amber-100/90 text-amber-800",
                          )}
                        >
                          {watchedIsActive
                            ? t("statusActive")
                            : t("statusPaused")}
                        </div>
                      </div>

                      <div className="mt-1">
                        <div className="text-sm text-eb-text/60">
                          {watchedIsActive
                            ? t("activeDescription")
                            : t("inactiveDescription")}
                        </div>

                        {showStatusInfo ? (
                          <div className="mt-3">
                            <InfoBox
                              icon
                              align="start"
                              className="bg-[rgb(var(--eb-shell)/0.40)] text-eb-text/75 ring-eb-stroke/15"
                            >
                              <p>{statusInfo}</p>
                            </InfoBox>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={watchedIsActive}
                      aria-label={t("activeLabel")}
                      onClick={() =>
                        setValue("isActive", !watchedIsActive, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-8 w-14 shrink-0 rounded-full border transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.20)]",
                        watchedIsActive
                          ? "border-[rgb(var(--eb-accent)/0.40)] bg-[rgb(var(--eb-accent)/0.34)]"
                          : "border-amber-300 bg-amber-200/90",
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-1 h-6 w-6 rounded-full bg-white shadow-[0_6px_14px_rgba(21,39,81,0.20)] transition-all duration-200",
                          watchedIsActive ? "left-7" : "left-1",
                        )}
                      />
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-eb-stroke/22 bg-[rgb(var(--eb-shell)/0.24)] px-4 py-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-eb-text/45">
                    {t("previewLabel")}
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-eb-text">
                        {watchedName?.trim() || t("untitledItem")}
                      </div>
                      <div className="mt-1 text-xs text-eb-text/55">
                        {selectedCategoryLabel}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums text-eb-text">
                        {formatMoneyV2(normalizedAmount, currency, appLocale, {
                          fractionDigits: 2,
                        })}
                      </div>
                      <div className="mt-1 text-xs text-eb-text/50">
                        {watchedIsActive
                          ? t("statusActive")
                          : t("statusPaused")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleRequestClose}
                  disabled={!canClose}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("cancel")}
                </button>

                <CtaButton
                  type="submit"
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
            </form>
          </div>
        </div>
      </div>
      {showDiscardConfirm ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[2rem] bg-[rgba(255,255,255,0.72)] backdrop-blur-[2px]">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-eb-stroke/20 bg-eb-surface p-5 shadow-[0_16px_40px_rgba(21,39,81,0.16)]">
            <div className="text-lg font-bold text-eb-text">
              {t("discardTitle")}
            </div>
            <div className="mt-2 text-sm text-eb-text/60">
              {t("discardDescription")}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleKeepEditing}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-eb-stroke/25 px-4 text-sm font-medium text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.28)]"
              >
                {t("keepEditing")}
              </button>

              <button
                type="button"
                onClick={handleConfirmDiscard}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-eb-danger px-4 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {t("discard")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
