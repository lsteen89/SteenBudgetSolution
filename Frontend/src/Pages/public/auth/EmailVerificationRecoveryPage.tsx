import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowRight, KeyRound, Mail } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import * as yup from "yup";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";

import type { ApiProblem } from "@/api/api.types";
import { resendVerificationRecovery } from "@/api/Services/User/resendVerificationRecovery";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useToast } from "@/ui/toast/toast";
import { toUserSuccessMessage } from "@/utils/i18n/apiErrors/apiSuccessMessages";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
import { recoveryDict } from "@/utils/i18n/pages/public/EmailVerificationRecovery.i18n";
import { tDict } from "@/utils/i18n/translate";

import faqBird from "@assets/Images/guideBirdLeft.png";

type FormValues = {
  email: string;
};

export default function EmailVerificationRecoveryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const locale = useAppLocale();
  const toast = useToast();

  const t = <K extends keyof typeof recoveryDict.sv>(k: K) =>
    tDict(k, locale, recoveryDict);

  const schema: yup.ObjectSchema<FormValues> = React.useMemo(
    () =>
      yup
        .object({
          email: yup
            .string()
            .trim()
            .required(t("yupEmailRequired"))
            .email(t("yupEmailInvalid")),
        })
        .required(),
    [locale],
  );

  const prefillsEmail = (params.get("email") ?? "").trim();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: prefillsEmail,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      const email = values.email.trim();

      const info = await resendVerificationRecovery({ email });

      toast.success(toUserSuccessMessage(info, locale), {
        id: "verification-recovery-ok",
      });

      navigate(`/login?email=${encodeURIComponent(email)}`, {
        replace: false,
      });
    } catch (e: unknown) {
      const p = e as ApiProblem;
      const msg = toUserMessage(p, locale);

      setError("email", {
        type: "server",
        message: msg,
      });

      toast.error(msg, {
        id: p.code ?? "verification-recovery-fail",
      });
    }
  };

  const showErrors = submitCount > 0;

  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden"></div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-10 sm:pt-14 pb-14 sm:pb-16"
      >
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px] md:items-start">
          <SurfaceCard className="p-5 sm:p-6">
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-shell/60">
              <KeyRound className="h-5 w-5 text-eb-accent" />
            </div>

            <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-eb-text">
              {t("title")}
            </h1>

            <p className="mt-2 max-w-prose text-sm text-eb-text/65">
              {t("lead")}
            </p>

            <div className="mt-5 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-eb-stroke/25 bg-eb-surface/80">
                  <Mail className="h-5 w-5 text-eb-text/70" />
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-eb-text">
                    {t("howTitle")}
                  </div>
                  <div className="mt-1 text-sm text-eb-text/65">
                    {t("howBody")}
                  </div>
                </div>
              </div>
            </div>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
            >
              <FormField
                label={t("emailLabel")}
                htmlFor="email"
                error={showErrors ? errors.email?.message : undefined}
              >
                <TextInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  {...register("email")}
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

                <SecondaryLink to="/login" className="justify-center">
                  {t("loginCta")}
                </SecondaryLink>
              </div>

              <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 p-4">
                <p className="text-sm text-eb-text/60">{t("footnote")}</p>
              </div>

              <div className="text-sm text-eb-text/60">
                <Link
                  to="/registration"
                  className="inline-flex items-center gap-2 font-semibold text-eb-text hover:text-eb-text/80 underline underline-offset-4 decoration-eb-stroke/60"
                >
                  {t("backToRegister")} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </form>
          </SurfaceCard>

          <div className="relative flex justify-center md:justify-end">
            <div className="relative md:mt-12">
              <div className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(65%_65%_at_50%_40%,rgba(77,185,254,0.14)_0%,transparent_70%)]" />
              <Mascot
                src={faqBird}
                alt=""
                size={220}
                mdSize={300}
                float
                shadow
              />
            </div>
          </div>
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
