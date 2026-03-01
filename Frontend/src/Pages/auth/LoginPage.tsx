import { yupResolver } from "@hookform/resolvers/yup";
import * as React from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";

import { toApiProblem } from "@/api/toApiProblem";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { useToast } from "@/ui/toast/toast";
import { toUserMessage } from "@/utils/i18n/apiErrors/toUserMessage";
console.log("toApiProblem ref", toApiProblem);

import { useAuth } from "@/hooks/auth/useAuth";

import Mascot from "@/components/atoms/animation/Mascot";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@components/layout/PageContainer";

import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { FormField } from "@/components/atoms/forms/FormField";
import { TextInput } from "@/components/atoms/InputField/TextInputv2";
import {
  TurnstileWidget,
  type TurnstileWidgetHandle,
} from "@/components/atoms/security/TurnstileWidget";

import LoginBird from "@assets/Images/LoginBird.png";

import type { ApiProblem } from "@/api/api.types";
import { loginSchema } from "@/schemas/auth/login/login.schema";
import type { LoginFormValues } from "@myTypes/User/Auth/loginForm.types";
import type { UserLoginDto } from "@myTypes/User/Auth/userLoginForm";

function parseRetryAfterSeconds(s?: string): number | null {
  if (!s) return null;
  const n = Number(String(s).trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

export default function LoginPage() {
  const nav = useNavigate();
  const { login, isLoading, accessToken } = useAuth();

  const toast = useToast();
  const locale = useAppLocale();

  const [lastProblem, setLastProblem] = React.useState<ApiProblem | null>(null);

  const [rateLimitUntil, setRateLimitUntil] = React.useState<number | null>(
    null,
  );
  const [tick, setTick] = React.useState(0); // forces re-render for countdown

  const blocked = rateLimitUntil !== null && Date.now() < rateLimitUntil;
  const secondsLeft = blocked
    ? Math.max(1, Math.ceil((rateLimitUntil! - Date.now()) / 1000))
    : 0;

  React.useEffect(() => {
    if (!blocked) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(id);
  }, [blocked]);

  const [challengeRequired, setChallengeRequired] = React.useState(false);
  const [failCount, setFailCount] = React.useState(0);
  const turnstileRef = React.useRef<TurnstileWidgetHandle>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      HumanToken: null,
      rememberMe: false,
      honeypot: "",
    },
  });

  const shouldShowChallenge = challengeRequired || failCount >= 2;
  const humanToken = watch("HumanToken");
  const emailValue = watch("email").trim();
  const [rootMessage, setRootMessage] = React.useState<string | null>(null);

  if (isLoading) return null;
  if (accessToken) return <Navigate to="/dashboard" replace />;

  const handleProblem = React.useCallback(
    (p: ApiProblem) => {
      if (p.status === 429) {
        const secs = parseRetryAfterSeconds(p.retryAfter);
        if (secs) setRateLimitUntil(Date.now() + secs * 1000);
        toast.error(toUserMessage(p, locale), { id: "login:429" });

        setLastProblem(null);
        setRootMessage(null);
        return;
      }

      if (p.isNetworkError || (p.status ?? 0) >= 500) {
        toast.error(toUserMessage(p, locale), { id: "login:net" });
        setLastProblem(null);
        setRootMessage(null);
        return;
      }

      setLastProblem(p);
      setRootMessage(toUserMessage(p, locale));
    },
    [locale, toast],
  );

  const onSubmit: SubmitHandler<LoginFormValues> = async (v) => {
    clearErrors();
    setRootMessage(null);
    setLastProblem(null);

    if (blocked) {
      toast.info(
        locale === "sv-SE"
          ? `För många försök. Försök igen om ${secondsLeft} sekunder.`
          : `Too many attempts. Try again in ${secondsLeft} seconds.`,
        { id: "login:blocked" },
      );
      return;
    }

    // Honeypot => pretend invalid creds (and return early)
    if (v.honeypot?.trim()) {
      const p: ApiProblem = {
        message: "Invalid",
        code: "Auth.InvalidCredentials",
        status: 401,
        isNetworkError: false,
        raw: null,
      };
      handleProblem(p);
      return;
    }

    // If challenge is visible, token must exist
    if (shouldShowChallenge && !v.HumanToken) {
      setError("HumanToken", {
        type: "turnstile",
        message:
          locale === "sv-SE"
            ? "Verifiera att du är människa."
            : "Please verify you are human.",
      });
      return;
    }

    try {
      const dto: UserLoginDto = {
        email: v.email.trim(),
        password: v.password,
        HumanToken: shouldShowChallenge ? v.HumanToken : null,
      };

      await login(dto, v.rememberMe);

      nav("/dashboard", { replace: true });
    } catch (e) {
      const p = toApiProblem(e);
      console.log("LOGIN ERROR RAW:", e);
      console.log("LOGIN PROBLEM:", p);

      if (p.code === "Verification.EmailNotConfirmed") {
        toast.info(
          locale === "sv-SE"
            ? "Du måste verifiera din e-post innan du kan logga in."
            : "You need to verify your email before you can log in.",
          { id: "login:not-confirmed" },
        );
        nav(`/email-confirmation?email=${encodeURIComponent(v.email.trim())}`, {
          replace: true,
        });
        return;
      }
      console.log(
        "status",
        p.status,
        "isNetworkError",
        p.isNetworkError,
        "code",
        p.code,
      );
      handleProblem(p);
      // Don't escalate for rate limit / network / 5xx
      if (p.status === 429 || p.isNetworkError || (p.status ?? 0) >= 500)
        return;

      // Server explicitly demands challenge: show it immediately
      const serverWantsChallenge =
        p.code === "Auth.HumanVerificationRequired" ||
        p.code === "HumanVerification.Required" ||
        p.code === "Auth.InvalidChallengeToken";

      if (serverWantsChallenge) {
        setChallengeRequired(true);
        setValue("HumanToken", null, { shouldValidate: true });
        turnstileRef.current?.reset();
        setError("HumanToken", {
          type: "turnstile",
          message:
            locale === "sv-SE"
              ? "Verifiera att du är människa för att fortsätta."
              : "Please verify you are human to continue.",
        });
        return;
      }

      // Otherwise: escalate after N auth-ish failures
      const nextFailCount = failCount + 1;
      setFailCount(nextFailCount);

      const nextShowChallenge = challengeRequired || nextFailCount >= 2;
      if (nextShowChallenge) {
        setChallengeRequired(true);
        setValue("HumanToken", null, { shouldValidate: true });
        turnstileRef.current?.reset();
      }
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
                Logga in
              </p>

              <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
                Välkommen tillbaka
              </h1>

              <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
                Logga in för att fortsätta.
              </p>

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="mt-6 space-y-5"
              >
                {rootMessage ? (
                  <div className="rounded-2xl border border-eb-stroke/30 bg-eb-surface/70 px-4 py-3">
                    <p className="text-sm font-semibold text-eb-text/85">
                      {rootMessage}
                    </p>
                  </div>
                ) : null}
                <div className="grid gap-4">
                  <FormField
                    label="E-post"
                    htmlFor="email"
                    error={errors.email?.message}
                  >
                    <TextInput
                      id="email"
                      type="email"
                      autoComplete="email"
                      {...register("email")}
                    />
                  </FormField>

                  <FormField
                    label="Lösenord"
                    htmlFor="password"
                    error={errors.password?.message}
                  >
                    <TextInput
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      {...register("password")}
                    />
                  </FormField>
                </div>

                <div className="hidden" aria-hidden="true">
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    {...register("honeypot")}
                  />
                </div>

                <div className="rounded-2xl border border-eb-stroke/25 bg-eb-surface/70 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <input
                      id="rememberMe"
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-eb-stroke/40 text-eb-accent
                                 focus:outline-none focus:ring-2 focus:ring-eb-accent/35"
                      {...register("rememberMe")}
                    />
                    <div>
                      <label
                        htmlFor="rememberMe"
                        className="text-sm font-semibold text-eb-text/85"
                      >
                        Kom ihåg mig
                      </label>
                      <p className="text-sm text-eb-text/55">
                        Håll mig inloggad på den här enheten i upp till 30
                        dagar.
                      </p>
                    </div>
                  </div>
                </div>

                {shouldShowChallenge ? (
                  <div className="space-y-2">
                    <TurnstileWidget
                      ref={turnstileRef}
                      siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
                      onToken={(t) =>
                        setValue("HumanToken", t, { shouldValidate: true })
                      }
                      onExpire={() =>
                        setValue("HumanToken", null, { shouldValidate: true })
                      }
                      onError={() =>
                        setError("HumanToken", {
                          type: "turnstile",
                          message: "Turnstile kunde inte laddas.",
                        })
                      }
                      className="rounded-2xl border border-eb-stroke/30 bg-eb-surface/70 px-3 py-3"
                    />
                    {errors.HumanToken?.message ? (
                      <p className="text-sm text-eb-alert">
                        {errors.HumanToken.message}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-eb-text/50">
                    Vi kan ibland be om en snabb verifiering för att skydda
                    konton.
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                  <CtaButton
                    type="submit"
                    disabled={
                      blocked ||
                      isSubmitting ||
                      (shouldShowChallenge && !humanToken)
                    }
                    aria-busy={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {blocked
                      ? locale === "sv-SE"
                        ? `Vänta ${secondsLeft}s`
                        : `Wait ${secondsLeft}s`
                      : isSubmitting
                        ? "Loggar in..."
                        : "Logga in"}
                  </CtaButton>

                  <SecondaryLink
                    to="/register"
                    className="w-full sm:w-auto justify-center"
                  >
                    Skapa konto
                  </SecondaryLink>

                  <SecondaryLink
                    to="/forgot-password"
                    className="w-full sm:w-auto justify-center"
                  >
                    Glömt lösenord?
                  </SecondaryLink>
                </div>
              </form>
            </SurfaceCard>

            <div
              aria-hidden="true"
              className="pointer-events-none hidden lg:block absolute left-full top-10 ml-10"
            >
              <div className="relative">
                <div className="absolute -inset-12 rounded-full bg-[radial-gradient(65%_65%_at_50%_40%,rgba(77,185,254,0.14)_0%,transparent_70%)]" />
                <div className="absolute left-1/2 top-full mt-3 h-10 w-56 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-text)/0.08)] blur-xl" />
                <div className="opacity-95">
                  <Mascot
                    src={LoginBird}
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
              src={LoginBird}
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
