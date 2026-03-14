import {
  ArrowLeft,
  Calculator,
  ChevronDown,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Pill } from "@/components/atoms/badges/Pill";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { cn } from "@/lib/utils";
import { appRoutes } from "@/routes/appRoutes";
import { howItWorksDict } from "@/utils/i18n/pages/public/HowItWorks.i18n";
import { tDict } from "@/utils/i18n/translate";
import PageContainer from "@components/layout/PageContainer";
import { useAuth } from "@hooks/auth/useAuth";

type FaqItem = { q: string; a: string };

function StepCard({
  icon: Icon,
  step,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  step: number;
  title: string;
  body: string;
}) {
  return (
    <SurfaceCard className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl border border-eb-stroke/30 bg-eb-shell/70 p-2">
          <Icon className="h-5 w-5 text-eb-text/75" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex min-w-5 items-center justify-center rounded-full",
                "h-5 px-2",
                "border border-eb-stroke/30 bg-eb-shell/70",
                "text-[11px] font-semibold text-eb-text/70",
              )}
            >
              {step}
            </span>

            <div className="text-sm font-semibold text-eb-text">{title}</div>
          </div>

          <div className="mt-1 text-xs leading-snug text-eb-text/65">
            {body}
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

export default function HowItWorksPage() {
  const locale = useAppLocale();
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const { authenticated, isLoading } = useAuth();
  const isAuthed = !!authenticated;

  const t = <K extends keyof typeof howItWorksDict.sv>(k: K) =>
    tDict(k, locale, howItWorksDict);

  const faqs = useMemo<FaqItem[]>(
    () => [
      { q: t("faqQ1"), a: t("faqA1") },
      { q: t("faqQ2"), a: t("faqA2") },
      { q: t("faqQ3"), a: t("faqA3") },
    ],
    [locale],
  );

  const steps = useMemo(
    () => [
      { icon: Wallet, title: t("stepIncomeTitle"), body: t("stepIncomeBody") },
      {
        icon: CreditCard,
        title: t("stepFixedTitle"),
        body: t("stepFixedBody"),
      },
      { icon: Target, title: t("stepFocusTitle"), body: t("stepFocusBody") },
      { icon: Calculator, title: t("stepDoneTitle"), body: t("stepDoneBody") },
    ],
    [locale],
  );

  if (isLoading) return null;

  const onPrimaryCta = () => {
    if (isAuthed) {
      navigate(`${appRoutes.dashboard}?wizard=1`);
      return;
    }

    navigate(appRoutes.registration);
  };

  const backTo = isAuthed ? appRoutes.dashboard : appRoutes.aboutUs;
  const secondaryTo = isAuthed ? appRoutes.dashboard : appRoutes.login;
  const secondaryLabel = isAuthed
    ? t("secondaryToDashboard")
    : t("secondaryLogin");
  const ctaLabel = isAuthed ? t("ctaCreateBudget") : t("ctaRegister");

  return (
    <PageContainer
      className={cn(
        "min-h-[100dvh] items-center md:px-20",
        "bg-gradient-to-br from-customBlue1 to-customBlue2 bg-cover bg-fixed",
      )}
      noPadding
    >
      <ContentWrapperV2 size="xl">
        <SurfaceCard
          tone="shell"
          className="rounded-[28px] px-4 py-6 md:px-6 md:py-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to={backTo}
              className="inline-flex items-center gap-2 text-sm font-semibold text-eb-text/70 hover:text-eb-text"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back")}
            </Link>

            <Pill className="h-7 border-eb-stroke/30 bg-eb-surface/75 px-3 text-[11px] text-eb-text/70">
              <Sparkles className="h-4 w-4" />
              {t("metaChip")}
            </Pill>
          </div>

          <div className="mt-5 grid grid-cols-1 items-start gap-6 lg:grid-cols-[3fr,2fr]">
            <SurfaceCard
              className={cn(
                "relative overflow-hidden p-0",
                "shadow-[0_24px_70px_rgba(21,39,81,0.12)]",
              )}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-b",
                  "from-[rgb(var(--eb-surface)/0.96)]",
                  "via-[rgb(var(--eb-surface)/0.90)]",
                  "to-[rgb(var(--eb-shell)/0.55)]",
                )}
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_65%_at_18%_12%,rgba(77,185,254,0.18)_0%,transparent_55%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />

              <div className="relative p-6 md:p-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-eb-stroke/30 bg-eb-shell/60 px-3 py-1 text-[11px] font-semibold text-eb-text/70 md:text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  {t("heroChip")}
                </div>

                <h1 className="mt-4 text-2xl font-semibold tracking-tight text-eb-text md:text-3xl">
                  {t("title")}
                </h1>

                <p className="mt-2 max-w-xl text-sm text-eb-text/70 md:text-base">
                  {t("lead")}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <CtaButton onClick={onPrimaryCta}>
                    <span className="inline-flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      {ctaLabel}
                    </span>
                  </CtaButton>

                  <SecondaryLink to={secondaryTo}>
                    {secondaryLabel}
                    <span aria-hidden="true" className="ml-2 translate-y-[1px]">
                      →
                    </span>
                  </SecondaryLink>
                </div>
              </div>
            </SurfaceCard>

            <aside className="grid gap-4">
              {steps.map((s, i) => (
                <StepCard
                  key={s.title}
                  icon={s.icon}
                  step={i + 1}
                  title={s.title}
                  body={s.body}
                />
              ))}
            </aside>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SurfaceCard className="p-5">
              <div className="text-sm font-semibold text-eb-text">
                {t("faqTitle")}
              </div>

              <div className="mt-3 space-y-2">
                {faqs.map((x, idx) => {
                  const open = openIdx === idx;
                  const contentId = `faq-${idx}`;

                  return (
                    <button
                      key={x.q}
                      type="button"
                      aria-expanded={open}
                      aria-controls={contentId}
                      onClick={() => setOpenIdx(open ? null : idx)}
                      className={cn(
                        "w-full rounded-2xl border text-left transition",
                        "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/25",
                        open
                          ? "border-eb-stroke/40 bg-eb-surface/90"
                          : "border-eb-stroke/30 bg-eb-surface/60 hover:bg-eb-surface/80",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 px-4 py-3">
                        <span className="text-xs font-semibold text-eb-text/90 md:text-sm">
                          {x.q}
                        </span>

                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-eb-text/60 transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </div>

                      {open && (
                        <div
                          id={contentId}
                          className="px-4 pb-4 text-xs leading-relaxed text-eb-text/70 md:text-sm"
                        >
                          {x.a}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </SurfaceCard>

            <SurfaceCard className="p-5">
              <div className="text-sm font-semibold text-eb-text">
                {t("tipsTitle")}
              </div>

              <ul className="mt-3 space-y-2 text-xs text-eb-text/70 md:text-sm">
                <li>• {t("tip1")}</li>
                <li>• {t("tip2")}</li>
                <li>• {t("tip3")}</li>
              </ul>
            </SurfaceCard>
          </div>
        </SurfaceCard>
      </ContentWrapperV2>
    </PageContainer>
  );
}
