import { useToast } from "@/ui/toast/toast";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  CalendarDays,
  Globe,
  KeyRound,
  Mail,
  Settings2,
  User2,
} from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

import {
  changePassword,
  updateSalaryPaymentTiming,
  updatePreferences,
  updateProfile,
} from "@/api/Services/User/settings";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryButton } from "@/components/atoms/buttons/SecondaryButton";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";
import { useBudgetDashboardMonthQuery } from "@/hooks/budget/useBudgetDashboardMonthQuery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { changePasswordSchema } from "@/schemas/settings/changePasswordSchema";
import {
  buildBudgetSettingsSchema,
  settingsSchema,
} from "@/schemas/settings/settingsSchema";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useBudgetMonthStore } from "@/stores/Budget/budgetMonthStore";
import { useUserPreferencesStore } from "@/stores/UserPreferences/userPreferencesStore";
import type { ChangePasswordFormValues } from "@/types/User/Settings/passwordSettings.types";
import type {
  BudgetSettingsFormValues,
  IncomePaymentDayType,
  SettingsFormValues,
} from "@/types/User/Settings/settings.types";
import { setAppLocale } from "@/utils/i18n/appLocaleStore";
import { settingsDict } from "@/utils/i18n/pages/private/settings/Settings.i18n";
import { tDict } from "@/utils/i18n/translate";

type SettingsTabKey = "account" | "budget" | "security";

const PAYMENT_DAY_OPTIONS = Array.from({ length: 28 }, (_, index) => index + 1);

function normalizeIncomePaymentDay(
  value: number | null | undefined,
): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 28) return null;
  return value;
}

function normalizeIncomePaymentDayType(
  value: IncomePaymentDayType | null | undefined,
): IncomePaymentDayType | null {
  if (value === "dayOfMonth" || value === "lastDayOfMonth") {
    return value;
  }

  return null;
}

function buildBudgetSettingsFormValues(
  incomePaymentDayType: IncomePaymentDayType | null | undefined,
  incomePaymentDay: number | null | undefined,
): BudgetSettingsFormValues {
  const normalizedType = normalizeIncomePaymentDayType(incomePaymentDayType);
  const normalizedDay = normalizeIncomePaymentDay(incomePaymentDay);

  if (normalizedType === "lastDayOfMonth") {
    return {
      incomePaymentDayType: "lastDayOfMonth",
      incomePaymentDay: null,
      updateCurrentAndFuture: false,
    };
  }

  if (normalizedDay !== null) {
    return {
      incomePaymentDayType: "dayOfMonth",
      incomePaymentDay: normalizedDay,
      updateCurrentAndFuture: false,
    };
  }

  return {
    incomePaymentDayType: normalizedType ?? "dayOfMonth",
    incomePaymentDay: null,
    updateCurrentAndFuture: false,
  };
}

function matchesBudgetSettings(
  current: BudgetSettingsFormValues,
  next: BudgetSettingsFormValues,
): boolean {
  return (
    current.incomePaymentDayType === next.incomePaymentDayType &&
    current.incomePaymentDay === next.incomePaymentDay
  );
}

export default function SettingsPage() {
  const locale = useAppLocale();
  const t = <K extends keyof typeof settingsDict.sv>(k: K) =>
    tDict(k, locale, settingsDict);

  const user = useAuthStore((s) => s.user);
  const mergeUser = useAuthStore((s) => s.mergeUser);

  const prefsLocale = useUserPreferencesStore((s) => s.locale);
  const prefsCurrency = useUserPreferencesStore((s) => s.currency);
  const setPreferences = useUserPreferencesStore((s) => s.setPreferences);
  const selectedYearMonth = useBudgetMonthStore((s) => s.selectedYearMonth);

  const toast = useToast();

  const [activeTab, setActiveTab] = React.useState<SettingsTabKey>("account");

  const localeLabels = {
    "sv-SE": "Svenska",
    "en-US": "English",
    "et-EE": "Eesti",
  } as const;

  const dashboardMonthQuery = useBudgetDashboardMonthQuery(selectedYearMonth);
  const dashboardIncome = dashboardMonthQuery.data?.liveDashboard?.income ?? null;
  const savedBudgetSettings = React.useMemo(
    () =>
      buildBudgetSettingsFormValues(
        dashboardIncome?.incomePaymentDayType,
        dashboardIncome?.incomePaymentDay,
      ),
    [dashboardIncome?.incomePaymentDayType, dashboardIncome?.incomePaymentDay],
  );

  const tabs = [
    { key: "account", label: t("accountTab"), icon: User2 },
    { key: "budget", label: t("budgetTab"), icon: CalendarDays },
    { key: "security", label: t("securityTab"), icon: KeyRound },
  ] as const;

  const budgetSettingsSchema = React.useMemo(
    () => buildBudgetSettingsSchema(t),
    [locale],
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: yupResolver(settingsSchema),
    defaultValues: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      locale: prefsLocale,
      currency: prefsCurrency,
    },
  });

  const {
    control: budgetControl,
    handleSubmit: handleSubmitBudget,
    reset: resetBudget,
    watch: watchBudget,
    setValue: setBudgetValue,
    clearErrors: clearBudgetErrors,
    formState: {
      errors: budgetErrors,
      isSubmitting: isSubmittingBudget,
      isDirty: isDirtyBudget,
      submitCount: budgetSubmitCount,
    },
  } = useForm<BudgetSettingsFormValues>({
    resolver: yupResolver(budgetSettingsSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: savedBudgetSettings,
  });

  const tWithLocale = <K extends keyof typeof settingsDict.sv>(
    k: K,
    loc: typeof locale,
  ) => tDict(k, loc, settingsDict);

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: {
      errors: passwordErrors,
      isSubmitting: isSubmittingPassword,
      isDirty: isDirtyPassword,
    },
  } = useForm<ChangePasswordFormValues>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      repeatNewPassword: "",
    },
  });

  React.useEffect(() => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      locale: prefsLocale,
      currency: prefsCurrency,
    });
  }, [user, prefsLocale, prefsCurrency, reset]);

  React.useEffect(() => {
    resetBudget(savedBudgetSettings);
  }, [savedBudgetSettings, resetBudget]);

  const onSubmit = async (values: SettingsFormValues) => {
    const [updatedUser, updatedPreferences] = await Promise.all([
      updateProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      }),
      updatePreferences({
        locale: values.locale,
        currency: values.currency,
      }),
    ]);

    mergeUser(updatedUser);
    setPreferences(updatedPreferences);
    setAppLocale(updatedPreferences.locale);

    toast.success(tWithLocale("saveSuccess", updatedPreferences.locale));
  };

  const onSubmitBudget = async (values: BudgetSettingsFormValues) => {
    const incomePaymentDay =
      values.incomePaymentDayType === "dayOfMonth"
        ? normalizeIncomePaymentDay(values.incomePaymentDay)
        : null;

    if (
      values.incomePaymentDayType === "dayOfMonth" &&
      incomePaymentDay === null
    ) {
      return;
    }

    await updateSalaryPaymentTiming({
      incomePaymentDayType: values.incomePaymentDayType,
      incomePaymentDay,
      updateCurrentAndFuture: values.updateCurrentAndFuture,
    });

    const refreshedDashboard = await dashboardMonthQuery.refetch();
    const refreshedBudgetSettings = buildBudgetSettingsFormValues(
      refreshedDashboard.data?.liveDashboard?.income?.incomePaymentDayType,
      refreshedDashboard.data?.liveDashboard?.income?.incomePaymentDay,
    );

    if (
      !matchesBudgetSettings(refreshedBudgetSettings, {
        incomePaymentDayType: values.incomePaymentDayType,
        incomePaymentDay,
        updateCurrentAndFuture: values.updateCurrentAndFuture,
      })
    ) {
      resetBudget(refreshedBudgetSettings);
      toast.error(t("budgetSaveError"));
      return;
    }

    resetBudget(refreshedBudgetSettings);
    toast.success(t("budgetSaveSuccess"));
  };

  const onSubmitPassword = async (values: ChangePasswordFormValues) => {
    await changePassword({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });

    resetPassword({
      currentPassword: "",
      newPassword: "",
      repeatNewPassword: "",
    });

    toast.success(t("passwordSaveSuccess"));
  };

  const onReset = () => {
    reset({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      locale: prefsLocale,
      currency: prefsCurrency,
    });
  };

  const onResetBudget = () => {
    resetBudget(savedBudgetSettings);
  };

  const showBudgetErrors = budgetSubmitCount > 0;
  const selectedIncomePaymentDayType = watchBudget("incomePaymentDayType");
  const showIncomePaymentDayField =
    selectedIncomePaymentDayType === "dayOfMonth";
  const salaryPaymentDaySummary =
    savedBudgetSettings.incomePaymentDayType === "lastDayOfMonth"
      ? t("lastDayOfMonth")
      : savedBudgetSettings.incomePaymentDay ?? t("notSet");

  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-28 left-[12%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-28 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
      </div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-10 sm:pt-14 pb-14 sm:pb-16"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-eb-text/70">
          <Settings2 className="h-4 w-4" />
          {t("kicker")}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-eb-text">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-prose text-sm text-eb-text/65">
            {t("lead")}
          </p>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <SurfaceCard className="p-2">
              <div
                role="tablist"
                aria-label={t("title")}
                className="grid gap-2 sm:grid-cols-3"
              >
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      id={`settings-tab-${tab.key}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`settings-panel-${tab.key}`}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-eb-accent/20",
                        isActive
                          ? "bg-eb-surface text-eb-text shadow-[0_8px_30px_rgb(21_39_81_/_0.08)]"
                          : "text-eb-text/65 hover:bg-[rgb(var(--eb-shell)/0.32)]",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>

            {activeTab === "account" ? (
              <div
                id="settings-panel-account"
                role="tabpanel"
                aria-labelledby="settings-tab-account"
                className="space-y-6"
              >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <SurfaceCard className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
                        <User2 className="h-5 w-5 text-eb-text/75" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-eb-text">
                          {t("profileTitle")}
                        </h2>
                        <p className="text-sm text-eb-text/60">
                          {t("profileBody")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <FormField
                        label={t("firstName")}
                        htmlFor="firstName"
                        error={errors.firstName?.message}
                      >
                        <TextInput id="firstName" {...register("firstName")} />
                      </FormField>

                      <FormField
                        label={t("lastName")}
                        htmlFor="lastName"
                        error={errors.lastName?.message}
                      >
                        <TextInput id="lastName" {...register("lastName")} />
                      </FormField>
                    </div>
                  </SurfaceCard>

                  <SurfaceCard className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
                        <Globe className="h-5 w-5 text-eb-accent" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-eb-text">
                          {t("prefsTitle")}
                        </h2>
                        <p className="text-sm text-eb-text/60">
                          {t("prefsBody")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <FormField
                        label={t("language")}
                        htmlFor="locale"
                        error={errors.locale?.message}
                      >
                        <Controller
                          name="locale"
                          control={control}
                          render={({ field }) => (
                            <select
                              id="locale"
                              className={cn(
                                "h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm text-eb-text",
                                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/30",
                              )}
                              {...field}
                            >
                              <option value="sv-SE">Svenska</option>
                              <option value="en-US">English</option>
                              <option value="et-EE">Eesti</option>
                            </select>
                          )}
                        />
                      </FormField>

                      <FormField
                        label={t("currency")}
                        htmlFor="currency"
                        error={errors.currency?.message}
                      >
                        <Controller
                          name="currency"
                          control={control}
                          render={({ field }) => (
                            <select
                              id="currency"
                              className={cn(
                                "h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm text-eb-text",
                                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/30",
                              )}
                              {...field}
                            >
                              <option value="EUR">EUR</option>
                              <option value="SEK">SEK</option>
                              <option value="USD">USD</option>
                            </select>
                          )}
                        />
                      </FormField>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <CtaButton
                        type="submit"
                        disabled={isSubmitting || !isDirty}
                      >
                        {isSubmitting ? t("saving") : t("save")}
                      </CtaButton>

                      <SecondaryButton
                        type="button"
                        onClick={onReset}
                        disabled={isSubmitting}
                      >
                        {t("reset")}
                      </SecondaryButton>
                    </div>
                  </SurfaceCard>
                </form>
              </div>
            ) : null}

            {activeTab === "budget" ? (
              <div
                id="settings-panel-budget"
                role="tabpanel"
                aria-labelledby="settings-tab-budget"
              >
                <form
                  onSubmit={handleSubmitBudget(onSubmitBudget)}
                  className="space-y-6"
                >
                  <SurfaceCard className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
                        <CalendarDays className="h-5 w-5 text-eb-accent" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-eb-text">
                          {t("budgetTitle")}
                        </h2>
                        <p className="text-sm text-eb-text/60">
                          {t("budgetBody")}
                        </p>
                        <p className="mt-2 text-sm text-eb-text/55">
                          {t("budgetCurrentMonthNotice")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 sm:max-w-xs">
                      <FormField
                        label={t("salaryPaymentRule")}
                        htmlFor="incomePaymentDayType"
                        error={
                          showBudgetErrors
                            ? budgetErrors.incomePaymentDayType?.message
                            : undefined
                        }
                      >
                        <Controller
                          name="incomePaymentDayType"
                          control={budgetControl}
                          render={({ field }) => (
                            <select
                              id="incomePaymentDayType"
                              aria-invalid={
                                showBudgetErrors &&
                                !!budgetErrors.incomePaymentDayType
                              }
                              className={cn(
                                "h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm text-eb-text",
                                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/30",
                              )}
                              value={field.value}
                              onChange={(event) => {
                                const nextValue = event.target
                                  .value as IncomePaymentDayType;

                                field.onChange(nextValue);

                                if (nextValue === "lastDayOfMonth") {
                                  setBudgetValue("incomePaymentDay", null, {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                  clearBudgetErrors("incomePaymentDay");
                                }
                              }}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            >
                              <option value="dayOfMonth">
                                {t("specificDayOfMonth")}
                              </option>
                              <option value="lastDayOfMonth">
                                {t("lastDayOfMonth")}
                              </option>
                            </select>
                          )}
                        />
                      </FormField>

                      {showIncomePaymentDayField ? (
                        <FormField
                          label={t("salaryPaymentDay")}
                          htmlFor="incomePaymentDay"
                          error={
                            showBudgetErrors
                              ? budgetErrors.incomePaymentDay?.message
                              : undefined
                          }
                        >
                          <Controller
                            name="incomePaymentDay"
                            control={budgetControl}
                            render={({ field }) => (
                              <select
                                id="incomePaymentDay"
                                aria-invalid={
                                  showBudgetErrors &&
                                  !!budgetErrors.incomePaymentDay
                                }
                                className={cn(
                                  "h-11 w-full rounded-2xl border border-eb-stroke/30 bg-eb-surface px-4 text-sm text-eb-text",
                                  "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/30",
                                )}
                                value={field.value ?? ""}
                                onChange={(event) => {
                                  const nextValue = event.target.value;
                                  field.onChange(
                                    nextValue === "" ? null : Number(nextValue),
                                  );
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              >
                                <option value="">
                                  {t("salaryPaymentDayPlaceholder")}
                                </option>
                                {PAYMENT_DAY_OPTIONS.map((day) => (
                                  <option key={day} value={day}>
                                    {day}
                                  </option>
                                ))}
                              </select>
                            )}
                          />
                        </FormField>
                      ) : null}
                    </div>

                    <div className="mt-5 rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-4 py-3">
                      <Controller
                        name="updateCurrentAndFuture"
                        control={budgetControl}
                        render={({ field }) => (
                          <div className="flex items-start gap-3">
                            <input
                              id="updateCurrentAndFuture"
                              type="checkbox"
                              className="mt-1 h-4 w-4 rounded border-eb-stroke/40 text-eb-accent focus:outline-none focus:ring-2 focus:ring-eb-accent/35"
                              checked={field.value}
                              onChange={(event) =>
                                field.onChange(event.target.checked)
                              }
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                            <div>
                              <label
                                htmlFor="updateCurrentAndFuture"
                                className="text-sm font-semibold text-eb-text/85"
                              >
                                {t("updateCurrentAndFutureLabel")}
                              </label>
                              <p className="text-sm text-eb-text/55">
                                {t("updateCurrentAndFutureHelp")}
                              </p>
                            </div>
                          </div>
                        )}
                      />
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <CtaButton
                        type="submit"
                        disabled={isSubmittingBudget || !isDirtyBudget}
                      >
                        {isSubmittingBudget ? t("saving") : t("save")}
                      </CtaButton>

                      <SecondaryButton
                        type="button"
                        onClick={onResetBudget}
                        disabled={isSubmittingBudget}
                      >
                        {t("reset")}
                      </SecondaryButton>
                    </div>
                  </SurfaceCard>
                </form>
              </div>
            ) : null}

            {activeTab === "security" ? (
              <div
                id="settings-panel-security"
                role="tabpanel"
                aria-labelledby="settings-tab-security"
              >
                <form
                  onSubmit={handleSubmitPassword(onSubmitPassword)}
                  className="space-y-6"
                >
                  <SurfaceCard className="p-5 sm:p-6">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
                        <KeyRound className="h-5 w-5 text-eb-text/75" />
                      </span>
                      <div>
                        <h2 className="text-lg font-bold text-eb-text">
                          {t("securityTitle")}
                        </h2>
                        <p className="text-sm text-eb-text/60">
                          {t("securityBody")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4">
                      <FormField
                        label={t("currentPassword")}
                        htmlFor="currentPassword"
                        error={passwordErrors.currentPassword?.message}
                      >
                        <TextInput
                          id="currentPassword"
                          type="password"
                          autoComplete="current-password"
                          {...registerPassword("currentPassword")}
                        />
                      </FormField>

                      <FormField
                        label={t("newPassword")}
                        htmlFor="newPassword"
                        error={passwordErrors.newPassword?.message}
                      >
                        <TextInput
                          id="newPassword"
                          type="password"
                          autoComplete="new-password"
                          {...registerPassword("newPassword")}
                        />
                      </FormField>

                      <FormField
                        label={t("repeatNewPassword")}
                        htmlFor="repeatNewPassword"
                        error={passwordErrors.repeatNewPassword?.message}
                      >
                        <TextInput
                          id="repeatNewPassword"
                          type="password"
                          autoComplete="new-password"
                          {...registerPassword("repeatNewPassword")}
                        />
                      </FormField>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <SecondaryButton
                        type="submit"
                        disabled={isSubmittingPassword || !isDirtyPassword}
                      >
                        {isSubmittingPassword
                          ? t("saving")
                          : t("changePassword")}
                      </SecondaryButton>
                    </div>
                  </SurfaceCard>
                </form>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <SurfaceCard className="p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
                  <Mail className="h-5 w-5 text-eb-text/75" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-eb-text">
                    {t("overviewTitle")}
                  </h2>
                  <p className="text-sm text-eb-text/60">{t("overviewBody")}</p>
                </div>
              </div>

              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-eb-text/60">{t("email")}</dt>
                  <dd className="font-medium text-eb-text">
                    {user?.email ?? "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-eb-text/60">{t("language")}</dt>
                  <dd className="font-medium text-eb-text">
                    {localeLabels[prefsLocale]}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-eb-text/60">{t("currency")}</dt>
                  <dd className="font-medium text-eb-text">{prefsCurrency}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-eb-text/60">{t("salaryPaymentDay")}</dt>
                  <dd className="font-medium text-eb-text">
                    {salaryPaymentDaySummary}
                  </dd>
                </div>
              </dl>
            </SurfaceCard>
          </div>
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
