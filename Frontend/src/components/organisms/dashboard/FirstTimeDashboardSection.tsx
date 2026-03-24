import { CheckCircle2, ChevronDown } from "lucide-react";
import * as React from "react";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaButton } from "@/components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";

import CalcBird from "@assets/Images/CalcBird.png";
import GoalBird from "@assets/Images/GoalBird.png";
import DashboardBird from "@assets/Images/GuideBird.png";
import RichBird from "@assets/Images/RichBird.png";

import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { firstTimeDashDict } from "@/utils/i18n/pages/private/dashboard/pages/FirstTimeDashboard.i18n";
import { tDict } from "@/utils/i18n/translate";

export interface FirstTimeDashboardSectionProps {
  onStartWizard: () => void;
  canResumeWizard?: boolean;
  onResumeWizard?: () => void;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.35)] px-3 py-1 text-xs font-semibold text-eb-text/70">
      {children}
    </span>
  );
}

export default function FirstTimeDashboardSection({
  onStartWizard,
  canResumeWizard = false,
  onResumeWizard,
}: FirstTimeDashboardSectionProps) {
  const [showWhy, setShowWhy] = React.useState(false);

  const locale = useAppLocale();
  const t = <K extends keyof typeof firstTimeDashDict.sv>(k: K) =>
    tDict(k, locale, firstTimeDashDict);

  const primaryCta =
    canResumeWizard && onResumeWizard
      ? { label: t("ctaResume"), onClick: onResumeWizard }
      : { label: t("ctaStart"), onClick: onStartWizard };

  const steps = [
    { step: t("step1"), title: t("step1Title") },
    { step: t("step2"), title: t("step2Title") },
    { step: t("step3"), title: t("step3Title") },
  ];

  return (
    <div className="relative mx-auto w-full max-w-6xl">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[3rem]">
        <div className="absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-eb-shell/55 blur-3xl" />
        <div className="absolute top-24 -right-40 h-[520px] w-[520px] rounded-full bg-eb-shell/35 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,0.6fr]">
        <SurfaceCard className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-eb-text/50">
            {t("kicker")}
          </p>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
            {t("titleA")}
            <span className="text-eb-accent"> {t("titleAccent")}</span>
          </h1>

          <p className="mt-2 max-w-prose text-sm text-eb-text/65">
            {t("lead")}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill>{t("pillTime")}</Pill>
            <Pill>{t("pillPrivate")}</Pill>
            <Pill>{t("pillAdjust")}</Pill>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            {steps.map((x) => (
              <div
                key={x.step}
                className="rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.25)] px-4 py-3"
              >
                <div className="text-xs font-semibold text-eb-text/55">
                  {x.step}
                </div>
                <div className="text-sm font-semibold text-eb-text">
                  {x.title}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <CtaButton
              onClick={primaryCta.onClick}
              className="w-full sm:w-auto"
            >
              {primaryCta.label}
            </CtaButton>

            <SecondaryLink
              to={appRoutes.dashboardHowItWorks}
              className="w-full sm:w-auto justify-center"
            >
              {t("quickGuide")}
            </SecondaryLink>
          </div>

          <button
            type="button"
            onClick={() => setShowWhy((v) => !v)}
            className="mt-5 inline-flex w-full items-center justify-between gap-2 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.25)] px-4 py-3 text-sm font-semibold text-eb-text/70 transition hover:bg-[rgb(var(--eb-shell)/0.35)]"
            aria-expanded={showWhy}
          >
            <span>{t("whyAsk")}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${
                showWhy ? "rotate-180" : ""
              }`}
            />
          </button>

          {showWhy && (
            <div className="mt-3 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.25)] p-4 text-sm leading-relaxed text-eb-text/65">
              {t("whyText")}
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-eb-stroke/25 bg-[rgb(var(--eb-shell)/0.25)] px-4 py-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 text-eb-accent" />
              <p className="text-sm text-eb-text/65">{t("privacy")}</p>
            </div>
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="shrink-0">
                <Mascot src={DashboardBird} alt="" size={90} float shadow />
              </div>
              <div>
                <p className="text-sm font-semibold text-eb-text">
                  {t("guideTitle")}
                </p>
                <p className="mt-1 text-sm text-eb-text/60">{t("guideBody")}</p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={CalcBird}
                alt=""
                className="h-12 w-12 rounded-xl"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-eb-text">
                  {t("realityTitle")}
                </p>
                <p className="mt-1 text-sm text-eb-text/60">
                  {t("realityBody")}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={GoalBird}
                alt=""
                className="h-12 w-12 rounded-xl"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-eb-text">
                  {t("planTitle")}
                </p>
                <p className="mt-1 text-sm text-eb-text/60">{t("planBody")}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onStartWizard}
              className="mt-4 inline-flex text-sm font-semibold text-eb-accent hover:opacity-90"
            >
              {t("startGuideInline")}
            </button>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <div className="flex items-center gap-4">
              <img
                src={RichBird}
                alt=""
                className="h-12 w-12 rounded-xl"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-semibold text-eb-text">
                  {t("bufferTitle")}
                </p>
                <p className="mt-1 text-sm text-eb-text/60">
                  {t("bufferBody")}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
