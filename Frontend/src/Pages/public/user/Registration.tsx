import { yupResolver } from "@hookform/resolvers/yup";
import { useAuth } from "@hooks/auth/useAuth";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { registrationDict } from "@/utils/i18n/pages/public/Registration.i18n";
import { tDict } from "@/utils/i18n/translate";

import type { ApiProblem } from "@/api/api.types";
import Mascot from "@/components/atoms/animation/Mascot";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { FormField } from "@/components/atoms/forms/FormField";
import { MatchHint } from "@/components/atoms/forms/MatchHint";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@components/layout/PageContainer";

import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import type { TurnstileWidgetHandle } from "@/components/atoms/security/TurnstileWidget";
import { TurnstileWidget } from "@/components/atoms/security/TurnstileWidget";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import regbird from "@assets/Images/RegBirdV2.png";

import type { RegistrationFormValues } from "@/types/User/Creation/registration.types";
import { getPostAuthRedirect } from "@/utils/auth/getPostAuthRedirect";
import { registerUser } from "@api/Services/User/registerUser";
import { registrationSchema } from "@schemas/auth/registration/registration.schema";

export default function Registration() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields, submitCount },
    setError,
    clearErrors,
  } = useForm<RegistrationFormValues>({
    resolver: yupResolver(registrationSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      repeatEmail: "",
      password: "",
      repeatPassword: "",
      humanToken: "",
      honeypot: "",
    },
  });

  const toast = useToast();
  const locale = useAppLocale();

  const t = <K extends keyof typeof registrationDict.sv>(k: K) =>
    tDict(k, locale, registrationDict);

  const { applyAuth } = useAuth();

  const humanToken = watch("humanToken");

  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null);
  const clearHumanToken = React.useCallback(() => {
    setValue("humanToken", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: false, // <- IMPORTANT
    });
  }, [setValue]);

  const resetChallenge = React.useCallback(() => {
    clearHumanToken();
    turnstileRef.current?.reset();
  }, [clearHumanToken]);

  const [existingUnconfirmedEmail, setExistingUnconfirmedEmail] =
    React.useState<string | null>(null);

  const showErrors = submitCount > 0;
  const email = watch("email");
  const repeatEmail = watch("repeatEmail");
  const password = watch("password");
  const repeatPassword = watch("repeatPassword");

  const showEmailMatch =
    !!(touchedFields.repeatEmail || submitCount > 0) && !!repeatEmail;
  const emailMatches = !!repeatEmail && email === repeatEmail;

  const showPwMatch =
    !!(touchedFields.repeatPassword || submitCount > 0) && !!repeatPassword;
  const pwMatches = !!repeatPassword && password === repeatPassword;

  const onSubmit = async (data: RegistrationFormValues) => {
    try {
      setExistingUnconfirmedEmail(null);
      const auth = await registerUser(data);
      await applyAuth(auth);

      toast.success(t("toastCodeSent"));

      navigate(getPostAuthRedirect(auth.accessToken), { replace: true });
    } catch (err: any) {
      resetChallenge();

      const p = err as ApiProblem;
      const code = p.code ?? "Unknown";
      // Optionally show field error if server says invalid challenge
      if (code === "Auth.InvalidChallengeToken") {
        setError("humanToken", {
          type: "server",
          message: "verifyFailed",
        });
        toast.error(toUserMessage(p, locale), { id: code });
        return;
      }

      if (p.status === 429) {
        toast.error(toUserMessage(p, locale), { id: code });
        return;
      }

      if (p.code === "Registration.EmailExistsUnconfirmed") {
        const email = data.email.trim();

        setError("email", {
          type: "server",
          message: "emailExistsUnconfirmed", // <-- key
        });

        setExistingUnconfirmedEmail(email);
        return;
      }

      if (
        p.code === "Registration.EmailAlreadyExists" ||
        p.code === "User.EmailAlreadyExists"
      ) {
        setError("email", { type: "server", message: "emailExists" }); // <-- key
        return;
      }

      // Validation errors: keep it calm, show generic form error
      if (
        p.code === "User.ValidationFailed" ||
        p.code === "Validation.Failed"
      ) {
        toast.error(toUserMessage(p, locale), {
          id: p.code ?? "Validation.Failed",
        });
        return;
      }

      toast.error(toUserMessage(p, locale), { id: code });
    }
  };

  const onTurnstileToken = React.useCallback(
    (t: string) => {
      setValue("humanToken", t, { shouldDirty: true, shouldTouch: true });
      clearErrors("humanToken");
    },
    [setValue, clearErrors],
  );
  React.useEffect(() => {
    if (!existingUnconfirmedEmail) return;

    if (email.trim() !== existingUnconfirmedEmail) {
      setExistingUnconfirmedEmail(null);
    }
  }, [email, existingUnconfirmedEmail]);

  const humanErr = showErrors ? errors.humanToken?.message : undefined;
  const humanErrText =
    humanErr && humanErr in registrationDict.sv
      ? t(humanErr as keyof typeof registrationDict.sv)
      : humanErr;

  const errText = (msg?: string) =>
    msg && msg in registrationDict.sv
      ? t(msg as keyof typeof registrationDict.sv)
      : msg;
  return (
    <>
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
            {/* Centered primary */}
            <div className="relative mx-auto w-full max-w-xl">
              <SurfaceCard className="p-6 sm:p-8">
                <p className="text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
                  {t("kicker")}
                </p>

                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
                  {t("titleA")}{" "}
                  <span className="text-eb-accent">{t("titleBrand")}</span>
                </h1>

                <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
                  {t("lead")}
                </p>

                <form
                  noValidate
                  onSubmit={handleSubmit(onSubmit)}
                  className="mt-6 space-y-5"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label={t("firstName")}
                      htmlFor="firstName"
                      error={errText(
                        showErrors ? errors.firstName?.message : undefined,
                      )}
                    >
                      <TextInput
                        id="firstName"
                        autoComplete="given-name"
                        aria-invalid={showErrors && !!errors.firstName}
                        {...register("firstName")}
                      />
                    </FormField>

                    <FormField
                      label={t("lastName")}
                      htmlFor="lastName"
                      error={errText(
                        showErrors ? errors.lastName?.message : undefined,
                      )}
                    >
                      <TextInput
                        id="lastName"
                        autoComplete="family-name"
                        aria-invalid={showErrors && !!errors.lastName}
                        {...register("lastName")}
                      />
                    </FormField>

                    <FormField
                      label={t("email")}
                      htmlFor="email"
                      error={errText(
                        showErrors ? errors.email?.message : undefined,
                      )}
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="email"
                        type="email"
                        autoComplete="email"
                        aria-invalid={showErrors && !!errors.email}
                        {...register("email")}
                      />
                    </FormField>

                    <FormField
                      label={t("repeatEmail")}
                      htmlFor="repeatEmail"
                      error={
                        showErrors ? errors.repeatEmail?.message : undefined
                      }
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="repeatEmail"
                        type="email"
                        autoComplete="email"
                        aria-invalid={showErrors && !!errors.repeatEmail}
                        {...register("repeatEmail")}
                      />
                      <MatchHint
                        show={showEmailMatch}
                        ok={emailMatches}
                        okText={t("emailOk")}
                        badText={t("emailBad")}
                      />
                    </FormField>

                    <FormField
                      label={t("pw")}
                      htmlFor="password"
                      error={showErrors ? errors.password?.message : undefined}
                      hint={t("pwHint")}
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="password"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={showErrors && !!errors.password}
                        {...register("password")}
                      />
                    </FormField>

                    <FormField
                      label={t("repeatPw")}
                      htmlFor="repeatPassword"
                      error={
                        showErrors ? errors.repeatPassword?.message : undefined
                      }
                      className="sm:col-span-2"
                    >
                      <TextInput
                        id="repeatPassword"
                        type="password"
                        autoComplete="new-password"
                        aria-invalid={showErrors && !!errors.repeatPassword}
                        {...register("repeatPassword")}
                      />
                      <MatchHint
                        show={showPwMatch}
                        ok={pwMatches}
                        okText={t("pwOk")}
                        badText={t("pwBad")}
                      />
                    </FormField>
                  </div>

                  {/* Honeypot */}
                  <div className="hidden" aria-hidden="true">
                    <input tabIndex={-1} {...register("honeypot")} />
                  </div>

                  <div className="space-y-2">
                    <TurnstileWidget
                      ref={turnstileRef}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onToken={onTurnstileToken}
                      onExpire={clearHumanToken}
                      onError={() => {
                        clearHumanToken();
                        setError("humanToken", {
                          type: "turnstile",
                          message: t("turnstileLoadFail"),
                        });
                      }}
                    />
                    {humanErrText ? (
                      <p className="text-sm text-eb-danger">{humanErrText}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                    <CtaButton
                      type="submit"
                      disabled={isSubmitting || !humanToken}
                      aria-busy={isSubmitting}
                      className="w-full sm:w-auto"
                    >
                      {isSubmitting ? t("submitBusy") : t("submitIdle")}
                    </CtaButton>

                    <SecondaryLink
                      to="/login"
                      className="w-full sm:w-auto justify-center"
                    >
                      {t("alreadyHave")}
                    </SecondaryLink>
                  </div>
                  {existingUnconfirmedEmail ? (
                    <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-4 py-4">
                      <p className="text-sm font-semibold text-eb-text/85">
                        {t("emailExistsUnconfirmed")}
                      </p>

                      <p className="mt-1 text-sm text-eb-text/60">
                        {t("emailExistsUnconfirmedHelp")}
                      </p>

                      <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <SecondaryLink
                          to={`/email-verification-recovery?email=${encodeURIComponent(existingUnconfirmedEmail)}`}
                          className="w-full sm:w-auto justify-center"
                        >
                          {t("continueVerification")}
                        </SecondaryLink>

                        <SecondaryLink
                          to={`/forgot-password?email=${encodeURIComponent(existingUnconfirmedEmail)}`}
                          className="w-full sm:w-auto justify-center"
                        >
                          {t("forgotPassword")}
                        </SecondaryLink>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 px-4 py-3">
                    <p className="text-sm text-eb-text/60">{t("privacy")}</p>
                  </div>
                </form>
                <div className="mt-5 rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 px-4 py-3">
                  <p className="text-sm text-eb-text/60">{t("codeInfo")} </p>
                </div>
              </SurfaceCard>

              {/* Mascot column */}
              {/* Secondary decoration (OUTSIDE layout flow) */}
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

            {/* Optional: show bird BELOW form on small screens instead of hiding it */}
            <div
              aria-hidden="true"
              className="pointer-events-none lg:hidden mt-8 flex justify-center"
            >
              <Mascot
                src={regbird}
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
    </>
  );
}
