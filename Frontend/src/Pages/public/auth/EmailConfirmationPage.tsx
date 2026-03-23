import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import * as yup from "yup";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { FormField } from "@/components/atoms/forms/FormField";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";

import { emailConfirmDict } from "@/utils/i18n/pages/public/EmailConfirmation.i18n";
import { tDict } from "@/utils/i18n/translate";

import type { ApiProblem } from "@/api/api.types";
import { resendVerificationEmail } from "@/api/Services/User/resendVerificationEmail";
import type { VerifyEmailCodeFn } from "@/api/Services/User/verifyEmailCode.wrapper";

import { OtpCodeInput } from "@/components/atoms/forms/OtpCodeInput";
import { useAuth } from "@/hooks/auth/useAuth";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useCooldown } from "@/hooks/ui/useCooldown";
import { cn } from "@/lib/utils";
import { useToast } from "@/ui/toast/toast";
import { toUserSuccessMessage } from "@/utils/i18n/apiErrors/apiSuccessMessages";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import regbird from "@assets/Images/RegBirdV2.png";

import { useAuthStore } from "@/stores/Auth/authStore";
import { readJwtEmail } from "@/utils/auth/jwt";

type FormValues = { code: string };

type Props = {
  verifyEmailCode: VerifyEmailCodeFn;
};

export default function EmailConfirmationPage({ verifyEmailCode }: Props) {
  const navigate = useNavigate();

  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);

  const email = readJwtEmail(accessToken) ?? "";

  const { applyAuth } = useAuth();

  const toast = useToast();
  const locale = useAppLocale();

  const t = <K extends keyof typeof emailConfirmDict.sv>(k: K) =>
    tDict(k, locale, emailConfirmDict);

  const schema: yup.ObjectSchema<FormValues> = React.useMemo(
    () =>
      yup
        .object({
          code: yup
            .string()
            .required(t("yupRequired"))
            .matches(/^\d{6}$/, t("yupFormat")),
        })
        .required(),
    [locale],
  );

  const { remaining, isActive, start } = useCooldown(60); // starts at 60s (initial send)
  const [resendLoading, setResendLoading] = React.useState(false);
  const [shakeKey, setShakeKey] = React.useState(0);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: { code: "" },
  });

  React.useEffect(() => {
    if (!email) {
      navigate("/login", { replace: true });
      return;
    }

    start(60);
  }, [email, navigate, start]);

  const onSubmit = async (v: FormValues) => {
    if (!email) {
      toast.error(t("toastMissingEmail"));
      return;
    }

    try {
      const auth = await verifyEmailCode({ code: v.code });

      await applyAuth(auth);

      toast.success(t("toastVerified"), { id: "verify-ok" });
      const from = new URLSearchParams(location.search).get("from");
      navigate(from ? decodeURIComponent(from) : "/dashboard", {
        replace: true,
      });
    } catch (e: any) {
      const p = e as ApiProblem;
      const msg = toUserMessage(p, locale);
      setError("code", { type: "server", message: msg });
      setShakeKey((x) => x + 1);
      toast.error(msg, { id: p.code ?? "verify-code" });
    }
  };

  const onResend = async () => {
    if (isActive || resendLoading) return;

    try {
      setResendLoading(true);

      const info = await resendVerificationEmail();

      start(60);
      toast.success(toUserSuccessMessage(info, locale), { id: "resend-ok" });
    } catch (e: unknown) {
      const p = e as ApiProblem;
      toast.error(toUserMessage(p, locale), { id: p.code ?? "resend-fail" });
    } finally {
      setResendLoading(false);
    }
  };

  const showErrors = submitCount > 0;

  return (
    <PageContainer noPadding className="relative">
      {/* background glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="lg"
        className="relative pt-10 sm:pt-14 pb-12 sm:pb-16"
      >
        <div className="relative mx-auto w-full max-w-xl">
          <SurfaceCard className="p-6 sm:p-8">
            <p className="text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
              {t("kicker")}
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
              {t("title")}
            </h1>

            <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
              {email ? (
                <>
                  {t("bodyWithEmailA")}{" "}
                  <span className="font-semibold">{email}</span>.
                </>
              ) : (
                t("bodyMissing")
              )}
            </p>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
            >
              <FormField
                label={t("codeLabel")}
                htmlFor="code"
                error={showErrors ? errors.code?.message : undefined}
              >
                <Controller
                  name="code"
                  control={control}
                  render={({ field }) => (
                    <OtpCodeInput
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      autoFocus
                      shakeKey={shakeKey}
                      onComplete={() => {
                        if (!isSubmitting) void handleSubmit(onSubmit)();
                      }}
                      aria-label={t("otpAria")}
                    />
                  )}
                />
              </FormField>
              <p className="text-xs text-eb-text/50">{t("helper")}</p>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <CtaButton
                  type="submit"
                  disabled={isSubmitting || !email}
                  aria-busy={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? t("submitBusy") : t("submitIdle")}
                </CtaButton>

                {/* Resend: countdown -> link */}
                <div className="pt-1">
                  {email ? (
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={isActive || resendLoading}
                      className={cn(
                        "text-sm font-semibold",
                        "text-eb-text/70 hover:text-eb-text",
                        "disabled:opacity-60 disabled:cursor-not-allowed",
                        "underline underline-offset-4 decoration-eb-stroke/40",
                      )}
                    >
                      {isActive
                        ? `${t("resendCountdownPrefix")} ${remaining}${t("resendCountdownSuffix")}`
                        : resendLoading
                          ? t("resendBusy")
                          : t("resendIdle")}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 px-4 py-3">
                <p className="text-sm text-eb-text/60">{t("info")}</p>
              </div>
            </form>
          </SurfaceCard>

          {/* Decoration */}
          <div
            aria-hidden="true"
            className="pointer-events-none hidden lg:block absolute left-full top-10 ml-10"
          >
            <div className="relative">
              <div
                className="absolute -inset-12 rounded-full
                bg-[radial-gradient(65%_65%_at_50%_40%,rgba(77,185,254,0.14)_0%,transparent_70%)]"
              />
              <div
                className="absolute left-1/2 top-full mt-3 h-10 w-56 -translate-x-1/2
                rounded-full bg-[rgb(var(--eb-text)/0.08)] blur-xl"
              />
              <div className="scale-[0.92] xl:scale-100 opacity-95">
                <Mascot
                  src={regbird}
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
          <Mascot src={regbird} alt="" size={200} mdSize={220} float shadow />
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
