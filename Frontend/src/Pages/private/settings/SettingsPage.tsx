import { useToast } from "@/ui/toast/toast";
import { yupResolver } from "@hookform/resolvers/yup";
import { Globe, KeyRound, Mail, Settings2, User2 } from "lucide-react";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";

import {
  changePassword,
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
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { changePasswordSchema } from "@/schemas/settings/changePasswordSchema";
import { settingsSchema } from "@/schemas/settings/settingsSchema";
import { useAuthStore } from "@/stores/Auth/authStore";
import { useUserPreferencesStore } from "@/stores/UserPreferences/userPreferencesStore";
import type { ChangePasswordFormValues } from "@/types/User/Settings/passwordSettings.types";
import type { SettingsFormValues } from "@/types/User/Settings/settings.types";
import { setAppLocale } from "@/utils/i18n/appLocaleStore";
import { settingsDict } from "@/utils/i18n/pages/private/settings/Settings.i18n";
import { tDict } from "@/utils/i18n/translate";

export default function SettingsPage() {
  const locale = useAppLocale();
  const t = <K extends keyof typeof settingsDict.sv>(k: K) =>
    tDict(k, locale, settingsDict);

  const user = useAuthStore((s) => s.user);
  const mergeUser = useAuthStore((s) => s.mergeUser);

  const prefsLocale = useUserPreferencesStore((s) => s.locale);
  const prefsCurrency = useUserPreferencesStore((s) => s.currency);
  const setPreferences = useUserPreferencesStore((s) => s.setPreferences);

  const toast = useToast();

  const localeLabels = {
    "sv-SE": "Svenska",
    "en-US": "English",
    "et-EE": "Eesti",
  } as const;

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

  const onSubmit = async (values: SettingsFormValues) => {
    const [updatedUser, updatedPreferences] = await Promise.all([
      updateProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
      }),
      updatePreferences({ locale: values.locale, currency: values.currency }),
    ]);

    mergeUser(updatedUser);
    setPreferences(updatedPreferences);
    setAppLocale(updatedPreferences.locale);

    toast.success(tWithLocale("saveSuccess", updatedPreferences.locale));
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
                    <p className="text-sm text-eb-text/60">{t("prefsBody")}</p>
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
                  <CtaButton type="submit" disabled={isSubmitting || !isDirty}>
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
                    {isSubmittingPassword ? t("saving") : t("changePassword")}
                  </SecondaryButton>
                </div>
              </SurfaceCard>
            </form>
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
              </dl>
            </SurfaceCard>
          </div>
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
