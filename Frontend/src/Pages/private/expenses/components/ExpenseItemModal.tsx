import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import BudgetEntryModalShell from "@/components/molecules/forms/budgetEditor/BudgetEntryModalShell";
import EditorPreviewCard from "@/components/molecules/forms/budgetEditor/EditorPreviewCard";
import MoneyInput from "@/components/molecules/forms/budgetEditor/MoneyInput";
import EditScopeRadioCards from "@/components/molecules/forms/editScope/EditScopeRadioCards";
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
import type {
  ExpenseEditScope,
  SubscriptionLifecycleStatus,
} from "@/types/budget/BudgetMonthsStatusDto";
import { asCategoryKey, labelCategory } from "@/utils/i18n/budget/categories";
import { expenseItemModalDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemModal.i18n";
import { expenseItemSchemaDict } from "@/utils/i18n/pages/private/expenses/ExpenseItemSchema.i18n";
import { tDict } from "@/utils/i18n/translate";
import { parseMoneyInput } from "@/utils/money/moneyInput";
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
  /**
   * Current lifecycle for subscription rows. `null` for non-subscription
   * rows or subscription rows that have never been given a lifecycle value
   * (backend treats null as "active" for materialized subscription rows).
   */
  subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
  canUpdatePlan: boolean;
  initialScope?: ExpenseEditScope;
  // Source-plan values surfaced by PR 5. `null` for month-only rows and for
  // linked rows where the read model returned partial source data. Used to
  // render an honest two-column current-month/budget-plan preview without
  // guessing totals. When any of these are null the modal falls back to the
  // simpler one-column preview.
  sourceName?: string | null;
  sourceCategoryId?: string | null;
  sourceAmountMonthly?: number | null;
  sourceIsActive?: boolean | null;
};

type ExpenseItemModalProps = {
  open: boolean;
  mode: ExpenseItemModalMode;
  row: ExpenseItemModalRow | null;
  monthLabel: string;
  categories: ExpenseCategoryDto[];
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (
    values: CreateExpenseItemApiPayload & {
      updateDefault?: boolean;
      scope?: ExpenseEditScope;
      subscriptionLifecycleStatus?: SubscriptionLifecycleStatus | null;
    },
  ) => Promise<void>;
};

const LIFECYCLE_OPTIONS: readonly SubscriptionLifecycleStatus[] = [
  "active",
  "paused",
  "cancelled",
] as const;

export default function ExpenseItemModal({
  open,
  mode,
  row,
  monthLabel,
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
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showStatusInfo, setShowStatusInfo] = useState(false);
  const [scope, setScope] = useState<ExpenseEditScope>("currentMonthOnly");
  // Default to `active` for a fresh modal. The reset effect below realigns
  // this with the row when editing, and the category-change effect realigns
  // it when the user switches between subscription/non-subscription.
  const [lifecycle, setLifecycle] =
    useState<SubscriptionLifecycleStatus>("active");
  // Snapshots of `scope` and `lifecycle` taken when the modal opens, so the
  // discard-confirm guard can detect drift on these local states. React Hook
  // Form's `isDirty` only covers fields it owns (name/category/amount/active);
  // without these refs the user could change scope or a subscription's
  // lifecycle, press Escape/backdrop, and silently lose the change.
  const initialScopeRef = useRef<ExpenseEditScope>("currentMonthOnly");
  const initialLifecycleRef =
    useRef<SubscriptionLifecycleStatus>("active");

  const isModalDirty =
    isDirty ||
    scope !== initialScopeRef.current ||
    lifecycle !== initialLifecycleRef.current;

  const handleRequestClose = () => {
    if (!canClose) return;

    if (isModalDirty) {
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
      const seededScope = row.initialScope ?? "currentMonthOnly";
      // Seed lifecycle from the row. Null lifecycle on a subscription row
      // means the backend never wrote a value — treat it as `active` so the
      // segmented control has a sensible default.
      const seededLifecycle = row.subscriptionLifecycleStatus ?? "active";
      setScope(seededScope);
      setLifecycle(seededLifecycle);
      initialScopeRef.current = seededScope;
      initialLifecycleRef.current = seededLifecycle;
      return;
    }

    reset({
      name: "",
      categoryId: defaultCategoryId,
      amountMonthly: "",
      isActive: true,
    });
    setScope("currentMonthOnly");
    setLifecycle("active");
    initialScopeRef.current = "currentMonthOnly";
    initialLifecycleRef.current = "active";
  }, [open, mode, row, reset, defaultCategoryId]);

  const nameError = errors.name?.message?.toString();
  const categoryError = errors.categoryId?.message?.toString();
  const amountError = errors.amountMonthly?.message?.toString();

  const selectedCategoryId = watch("categoryId");
  const watchedName = watch("name");
  const watchedAmount = watch("amountMonthly");
  const watchedIsActive = watch("isActive");
  const selectedCategoryKey = useMemo(() => {
    const category = categories.find((x) => x.id === selectedCategoryId);
    return category ? asCategoryKey(category.code) : "other";
  }, [categories, selectedCategoryId]);
  const isSubscriptionCategory = selectedCategoryKey === "subscription";

  // When the category transitions to subscription, default the lifecycle to
  // `active` so the visible segmented control has a sensible state. When
  // transitioning away from subscription we leave the local state alone —
  // it's hidden, and we explicitly submit `null` for non-subscription rows.
  useEffect(() => {
    if (!open) return;
    if (!isSubscriptionCategory) return;
    if (mode === "edit" && row?.subscriptionLifecycleStatus) {
      // Already seeded from the row by the reset effect above.
      return;
    }
    setLifecycle((prev) => prev ?? "active");
  }, [open, isSubscriptionCategory, mode, row]);
  const normalizedAmount =
    parseMoneyInput(watchedAmount, {
      allowNegative: false,
      maxDecimals: 2,
    }) ?? 0;
  const nameField = register("name");
  const statusInfo = watchedIsActive ? t("activeInfo") : t("inactiveInfo");
  // budgetPlanOnly never writes the month row, so the backend silently
  // drops any lifecycle value sent in that scope. Make the wire payload
  // honest: keep the lifecycle from the row (unchanged) rather than what
  // the segmented control happens to hold. The control itself is disabled
  // when this is true (see render below) so the user can never set a value
  // we won't honour.
  const lifecycleControlDisabled =
    mode === "edit" && scope === "budgetPlanOnly";
  // When disabled, show the value we will actually submit (the row's
  // original lifecycle) so the radios cannot say "Paused" while the
  // payload sends "active". Keep the underlying `lifecycle` state alone
  // so the user's pre-disable selection comes back if they switch the
  // scope to something that does write the month row.
  const displayedLifecycle: SubscriptionLifecycleStatus =
    lifecycleControlDisabled
      ? (row?.subscriptionLifecycleStatus ?? "active")
      : lifecycle;
  const submitForm = handleSubmit(
    async (values) => {
      const parsed = apiSchema.parse(values);
      // Lifecycle is meaningful only for subscription rows. Backend rule:
      // non-subscription rows must send `null`. Sending an explicit value
      // here (rather than omitting the field) makes the rule visible in the
      // wire payload and prevents accidental retention of a stale value
      // when the user changes the category away from subscription.
      const lifecycleForSubmit: SubscriptionLifecycleStatus | null =
        !isSubscriptionCategory
          ? null
          : lifecycleControlDisabled
            ? (row?.subscriptionLifecycleStatus ?? "active")
            : lifecycle;

      await onSubmit(
        mode === "edit"
          ? {
              ...parsed,
              updateDefault: scope === "currentMonthAndBudgetPlan",
              scope,
              subscriptionLifecycleStatus: lifecycleForSubmit,
            }
          : {
              ...parsed,
              subscriptionLifecycleStatus: lifecycleForSubmit,
            },
      );
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

  const isPlanOnlyPreview = mode === "edit" && scope === "budgetPlanOnly";
  // When the scope is `budgetPlanOnly`, the current-month row is untouched.
  // The preview headline must reflect that — show the existing row values, not
  // the user's pending edits — so the preview cannot be misread as "this is
  // what the current month will look like after I save".
  const previewSourceName =
    isPlanOnlyPreview && row ? row.name : watchedName;
  const previewSourceCategoryId =
    isPlanOnlyPreview && row ? row.categoryId : selectedCategoryId;
  const previewSourceAmount =
    isPlanOnlyPreview && row ? row.amountMonthly : normalizedAmount;
  const previewSourceIsActive =
    isPlanOnlyPreview && row ? row.isActive : watchedIsActive;

  // Plan-aware two-column preview is gated on real source-plan data (PR 5):
  // - month-only rows have no plan column to render honestly
  // - rows the read model returned without source values (defensive) fall
  //   back to the one-column preview instead of guessing
  // The block is only meaningful in edit mode — create mode is always
  // month-only, so there is nothing to compare against.
  const planPreviewAvailable =
    mode === "edit" &&
    !!row &&
    row.sourceAmountMonthly != null &&
    row.sourceCategoryId != null &&
    row.sourceIsActive != null &&
    row.sourceName != null;
  const currentMonthReceivesEdit =
    scope === "currentMonthOnly" || scope === "currentMonthAndBudgetPlan";
  const budgetPlanReceivesEdit =
    scope === "currentMonthAndBudgetPlan" || scope === "budgetPlanOnly";
  // Per-column amounts use either the user's pending edit or the existing
  // source/row value, depending on which column the chosen scope writes.
  // The result is what the row will look like in each surface after save —
  // not a guessed total.
  const currentColumnAmount = planPreviewAvailable
    ? currentMonthReceivesEdit
      ? normalizedAmount
      : (row?.amountMonthly ?? 0)
    : 0;
  const planColumnAmount = planPreviewAvailable
    ? budgetPlanReceivesEdit
      ? normalizedAmount
      : (row?.sourceAmountMonthly ?? 0)
    : 0;
  const currentColumnAmountFormatted = formatMoneyV2(
    currentColumnAmount,
    currency,
    appLocale,
    { fractionDigits: 2 },
  );
  const planColumnAmountFormatted = formatMoneyV2(
    planColumnAmount,
    currency,
    appLocale,
    { fractionDigits: 2 },
  );

  const previewCategoryLabel = useMemo(() => {
    const category = categories.find((x) => x.id === previewSourceCategoryId);
    if (!category) return "—";

    return labelCategory(asCategoryKey(category.code), appLocale);
  }, [appLocale, categories, previewSourceCategoryId]);

  const previewTitle = previewSourceName?.trim() || t("untitledItem");
  const previewAmount = previewSourceAmount;
  const previewStatus = previewSourceIsActive
    ? t("statusActive")
    : t("statusPaused");
  const previewLabel = isPlanOnlyPreview
    ? t("previewLabelPlanOnly")
    : t("previewLabel");

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
        <div ref={dialogRef} className="w-full max-w-[680px]">
          <BudgetEntryModalShell
            titleId="expense-item-modal-title"
            descriptionId="expense-item-modal-description"
            eyebrow={t("eyebrow")}
            title={mode === "create" ? t("titleCreate") : t("titleEdit")}
            context={monthLabel}
            description={t("description")}
            closeAriaLabel={t("closeAriaLabel")}
            canClose={canClose}
            onClose={handleRequestClose}
            footer={
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                  form="expense-item-form"
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
              id="expense-item-form"
              onSubmit={submitHandler}
              noValidate
            >
              <div className="grid gap-3.5">
                {mode === "create" ? (
                  <div
                    data-testid="expense-item-modal-month-only-callout"
                    className="rounded-2xl border border-[rgb(var(--eb-accent)/0.24)] bg-[rgb(var(--eb-accent)/0.08)] px-4 py-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <Info
                        className="mt-0.5 h-4 w-4 shrink-0 text-[rgb(var(--eb-accent))]"
                        aria-hidden="true"
                      />
                      <p className="text-sm leading-snug text-eb-text/75">
                        {t("monthOnlyCreateCallout").replace(
                          "{month}",
                          monthLabel,
                        )}
                      </p>
                    </div>
                  </div>
                ) : null}

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
                  <MoneyInput
                    id="expense-amount"
                    aria-invalid={!!amountError}
                    {...register("amountMonthly")}
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

                {isSubscriptionCategory ? (
                  <fieldset
                    data-testid="expense-item-modal-lifecycle-section"
                    data-disabled={lifecycleControlDisabled ? "true" : "false"}
                    className="rounded-2xl border border-eb-stroke/20 bg-eb-surface px-4 py-4"
                  >
                    <legend className="px-1 text-sm font-semibold text-eb-text">
                      {t("lifecycleSectionLabel")}
                    </legend>
                    <p className="mt-1 text-xs text-eb-text/60">
                      {t("lifecycleSectionDescription")}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={t("lifecycleSectionLabel")}
                      aria-disabled={lifecycleControlDisabled}
                      className="mt-3 grid grid-cols-3 gap-2"
                    >
                      {LIFECYCLE_OPTIONS.map((option) => {
                        const selected = displayedLifecycle === option;
                        const optionLabel =
                          option === "active"
                            ? t("lifecycleActive")
                            : option === "paused"
                              ? t("lifecyclePaused")
                              : t("lifecycleCancelled");
                        return (
                          <button
                            key={option}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            data-testid={`expense-item-modal-lifecycle-${option}`}
                            disabled={isSaving || lifecycleControlDisabled}
                            onClick={() => setLifecycle(option)}
                            className={cn(
                              "flex h-10 items-center justify-center rounded-xl border text-sm font-medium transition",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--eb-accent)/0.20)]",
                              selected
                                ? "border-[rgb(var(--eb-accent)/0.55)] bg-[rgb(var(--eb-accent)/0.12)] text-[rgb(var(--eb-accent))]"
                                : "border-eb-stroke/25 bg-eb-surface text-eb-text/70 hover:bg-[rgb(var(--eb-shell)/0.25)]",
                              "disabled:cursor-not-allowed disabled:opacity-50",
                            )}
                          >
                            {optionLabel}
                          </button>
                        );
                      })}
                    </div>
                    <p
                      data-testid="expense-item-modal-lifecycle-hint"
                      className="mt-2 text-xs text-eb-text/55"
                    >
                      {lifecycleControlDisabled
                        ? t("lifecyclePlanOnlyHint")
                        : displayedLifecycle === "active"
                          ? t("lifecycleActiveHint")
                          : displayedLifecycle === "paused"
                            ? t("lifecyclePausedHint")
                            : t("lifecycleCancelledHint")}
                    </p>
                  </fieldset>
                ) : null}

                {mode === "edit" ? (
                  <EditScopeRadioCards
                    value={scope}
                    onChange={setScope}
                    monthLabel={monthLabel}
                    canUpdatePlan={row?.canUpdatePlan ?? false}
                    disabledPlanHint={t("scopePlanDisabledHint").replace(
                      "{month}",
                      monthLabel,
                    )}
                    disabled={isSaving}
                    testId="expense-item-modal-scope-toggle"
                  />
                ) : null}

                <EditorPreviewCard
                  label={previewLabel}
                  title={previewTitle}
                  subtitle={previewCategoryLabel}
                  amount={formatMoneyV2(previewAmount, currency, appLocale, {
                    fractionDigits: 2,
                  })}
                  status={previewStatus}
                  muted={!previewSourceIsActive}
                >
                  {planPreviewAvailable ? (
                    // Two-column plan preview. Each column always renders an
                    // explicit amount and a "remains unchanged" / "receives
                    // the edited values" hint, so the user can see at a
                    // glance which surface the chosen scope actually writes.
                    // Reuses the existing previewCurrentMonthUnchanged /
                    // previewBudgetPlanReceivesEdit strings as scope-agnostic
                    // hints rather than budget-plan-only copy.
                    <div
                      data-testid="expense-item-modal-plan-preview"
                      data-current-receives-edit={currentMonthReceivesEdit}
                      data-plan-receives-edit={budgetPlanReceivesEdit}
                      className="grid gap-2 rounded-xl border border-eb-stroke/18 bg-white/62 px-3 py-2.5 text-xs text-eb-text/65 sm:grid-cols-2"
                    >
                      <div data-testid="expense-item-modal-plan-preview-current">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-eb-text/42">
                          {t("previewCurrentMonthLabel")}
                        </span>
                        <span className="mt-1 block text-sm font-semibold tabular-nums text-eb-text">
                          {currentColumnAmountFormatted}
                        </span>
                        <span className="mt-0.5 block">
                          {currentMonthReceivesEdit
                            ? t("previewBudgetPlanReceivesEdit")
                            : t("previewCurrentMonthUnchanged")}
                        </span>
                      </div>
                      <div data-testid="expense-item-modal-plan-preview-plan">
                        <span className="block text-[10px] font-semibold uppercase tracking-wide text-eb-text/42">
                          {t("previewBudgetPlanLabel")}
                        </span>
                        <span className="mt-1 block text-sm font-semibold tabular-nums text-eb-text">
                          {planColumnAmountFormatted}
                        </span>
                        <span className="mt-0.5 block">
                          {budgetPlanReceivesEdit
                            ? t("previewBudgetPlanReceivesEdit")
                            : t("previewCurrentMonthUnchanged")}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </EditorPreviewCard>
              </div>
            </form>
          </BudgetEntryModalShell>
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
