import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";

import type { ApiProblem } from "@/api/api.types";
import { resetPassword } from "@/api/Auth/requestPassword";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@components/layout/PageContainer";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { passwordResetDict } from "@/utils/i18n/pages/public/PasswordReset.i18n";
import { tDict } from "@/utils/i18n/translate";

import resetBird from "@assets/Images/ForgotPasswordBird.png";
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from "@schemas/auth/login/resetPassword.schema";

export default function PasswordResetPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const locale = useAppLocale();

  const t = <K extends keyof typeof passwordResetDict.sv>(k: K) =>
    tDict(k, locale, passwordResetDict);

  const [submitted, setSubmitted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<ResetPasswordFormValues>({
    resolver: yupResolver(resetPasswordSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: searchParams.get("email") ?? "",
      code: searchParams.get("code") ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const showErrors = submitCount > 0;

  const onSubmit = async (data: ResetPasswordFormValues) => {
    try {
      await resetPassword({
        email: data.email,
        code: data.code,
        newPassword: data.newPassword,
      });

      setSubmitted(true);
      toast.success(t("toastSuccess"), { id: "password-reset-success" });
    } catch (err: unknown) {
      const p = err as ApiProblem;

      toast.error(p?.code ? toUserMessage(p, locale) : t("toastGenericError"), {
        id: p?.code ?? "PasswordReset.Unknown",
      });
    }
  };

  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="lg"
        className="relative pt-10 sm:pt-14 pb-12 sm:pb-16"
      >
        <div className="relative">
          <div className="relative mx-auto w-full max-w-xl">
            <SurfaceCard className="p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
                {t("kicker")}
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
                {t("titleA")}{" "}
                <span className="text-eb-accent">{t("titleB")}</span>
              </h1>

              <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
                {submitted ? t("leadSubmitted") : t("lead")}
              </p>

              {!submitted ? (
                <form
                  noValidate
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-5"
                >
                  <FormField
                    label={t("email")}
                    htmlFor="email"
                    error={showErrors ? errors.email?.message : undefined}
                  >
                    <TextInput
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("emailPlaceholder")}
                      aria-invalid={showErrors && !!errors.email}
                      {...register("email")}
                    />
                  </FormField>

                  <FormField
                    label={t("code")}
                    htmlFor="code"
                    error={showErrors ? errors.code?.message : undefined}
                  >
                    <TextInput
                      id="code"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder={t("codePlaceholder")}
                      aria-invalid={showErrors && !!errors.code}
                      {...register("code")}
                    />
                  </FormField>

                  <FormField
                    label={t("newPassword")}
                    htmlFor="newPassword"
                    error={showErrors ? errors.newPassword?.message : undefined}
                  >
                    <TextInput
                      id="newPassword"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={showErrors && !!errors.newPassword}
                      {...register("newPassword")}
                    />
                  </FormField>

                  <FormField
                    label={t("confirmPassword")}
                    htmlFor="confirmPassword"
                    error={
                      showErrors ? errors.confirmPassword?.message : undefined
                    }
                  >
                    <TextInput
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={showErrors && !!errors.confirmPassword}
                      {...register("confirmPassword")}
                    />
                  </FormField>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <CtaButton
                      type="submit"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? t("submitBusy") : t("submitIdle")}
                    </CtaButton>

                    <SecondaryLink
                      to="/forgot-password"
                      className="w-full sm:w-auto justify-center"
                    >
                      {t("requestNewCode")}
                    </SecondaryLink>
                  </div>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] px-4 py-4">
                    <p className="text-sm text-eb-text/70">
                      {t("successBody")}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <CtaButton
                      type="button"
                      onClick={() => navigate("/login")}
                      className="w-full sm:w-auto"
                    >
                      {t("backToLogin")}
                    </CtaButton>
                  </div>
                </div>
              )}
            </SurfaceCard>

            <div
              aria-hidden="true"
              className="pointer-events-none hidden lg:block absolute left-full top-10 ml-10"
            >
              <div className="relative">
                <div className="absolute -inset-12 rounded-full bg-[radial-gradient(65%_65%_at_50%_40%,rgba(77,185,254,0.14)_0%,transparent_70%)]" />
                <div className="absolute left-1/2 top-full mt-3 h-10 w-56 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-text)/0.08)] blur-xl" />
                <div className="scale-[0.92] xl:scale-100 opacity-95">
                  <Mascot
                    src={resetBird}
                    alt=""
                    size={240}
                    mdSize={320}
                    float
                    shadow
                  />
                </div>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none lg:hidden mt-8 flex justify-center"
          >
            <Mascot
              src={resetBird}
              alt=""
              size={200}
              mdSize={220}
              float
              shadow
            />
          </div>
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
