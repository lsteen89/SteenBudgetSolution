import MainPageBird from "@assets/Images/MainPageBird.png";
import {
  BookOpenIcon,
  ChartBarIcon,
  ChevronRightIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import React from "react";
import { Link } from "react-router-dom";

import Mascot from "@/components/atoms/animation/Mascot";
import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { secondaryActionClass } from "@/components/atoms/buttons/ctaStyles";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { appRoutes } from "@/routes/appRoutes";
import { homeDict } from "@/utils/i18n/pages/public/HomePage.i18n";
import { tDict } from "@/utils/i18n/translate";

import "@styles/animations.css";

type T = (key: keyof typeof homeDict.sv) => string;

const scrollToHash = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: "smooth", block: "start" });
};

const Wrap: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">{children}</div>
);

const Kicker: React.FC<React.PropsWithChildren> = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-eb-text/50">
    {children}
  </p>
);

const Hero: React.FC<{ t: T }> = ({ t }) => (
  <section id="top" className="relative px-4 pt-12 pb-8 sm:px-6 sm:pt-14 lg:pt-16">
    {/* soft blurred blobs */}
    <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden" aria-hidden="true">
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-3xl" />
      <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-3xl" />
      <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-3xl" />
    </div>

    <div className="mx-auto w-full max-w-6xl">
      <div className="grid items-center gap-10 md:grid-cols-[1.04fr_0.96fr] md:gap-12">
        <div
          className={[
            "relative overflow-hidden rounded-3xl p-7 sm:p-9",
            "bg-eb-surface/90 backdrop-blur-md",
            "border border-eb-stroke/30",
            "shadow-[0_18px_50px_rgba(21,39,81,0.12)]",
            "text-eb-text",
          ].join(" ")}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--eb-shell)/0.45)] via-[rgb(var(--eb-surface)/0.14)] to-transparent"
          />
          <div className="relative">
            <Kicker>{t("heroKicker")}</Kicker>

            <h1 className="mt-3 text-3xl font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-4xl">
              {t("heroTitleA")}{" "}
              <span className="text-eb-accent">{t("heroTitleBrand")}</span>
            </h1>

            <p className="mt-4 max-w-[42ch] text-base leading-relaxed text-eb-text/70">
              {t("heroBody")}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CtaLink
                to={appRoutes.registration}
                className="h-12 px-6 text-base"
              >
                {t("ctaPrimary")}
              </CtaLink>
              <a
                href="#how"
                onClick={scrollToHash("how")}
                className={cn(secondaryActionClass, "h-12 px-6 text-base")}
              >
                {t("ctaSecondary")}
              </a>
            </div>

            <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-eb-text/55">
              <LockClosedIcon className="h-[15px] w-[15px] text-eb-text/40" aria-hidden="true" />
              {t("heroPrivacy")}
            </p>
          </div>
        </div>

        {/* Mascot */}
        <div className="flex justify-center md:justify-end">
          <Mascot
            src={MainPageBird}
            alt="eBudget"
            size={280}
            smSize={340}
            mdSize={380}
            lgSize={440}
          />
        </div>
      </div>
    </div>
  </section>
);

const BenefitRow: React.FC<{ t: T }> = ({ t }) => {
  const items = [
    { Icon: BookOpenIcon, title: t("b1Title"), body: t("b1Body") },
    { Icon: ChartBarIcon, title: t("b2Title"), body: t("b2Body") },
    { Icon: LockClosedIcon, title: t("b3Title"), body: t("b3Body") },
  ];
  return (
    <section className="px-4 pb-3 pt-2 sm:px-6" aria-label={t("b1Title")}>
      <Wrap>
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {items.map(({ Icon, title, body }) => (
            <li
              key={title}
              className="rounded-3xl border border-eb-stroke/40 bg-eb-surface/85 p-6 shadow-[0_8px_26px_rgba(15,23,42,0.05)]"
            >
              <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-eb-accent/20 bg-eb-accentSoft/70 text-eb-accent">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="text-base font-bold text-eb-text">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-eb-text/60">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  );
};

const HowItWorks: React.FC<{ t: T }> = ({ t }) => {
  const steps = [
    { n: "01", tag: t("hiwStep1Tag"), title: t("hiwStep1Title"), body: t("hiwStep1Body") },
    { n: "02", tag: t("hiwStep2Tag"), title: t("hiwStep2Title"), body: t("hiwStep2Body") },
    { n: "03", tag: t("hiwStep3Tag"), title: t("hiwStep3Title"), body: t("hiwStep3Body") },
  ];
  return (
    <section id="how" className="scroll-mt-24 px-4 py-10 sm:px-6 sm:py-12">
      <Wrap>
        <header className="mx-auto mb-8 max-w-[56ch] text-center">
          <Kicker>{t("hiwKicker")}</Kicker>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.015em] text-eb-text sm:text-[28px]">
            {t("hiwTitle")}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-eb-text/65">
            {t("hiwBody")}
          </p>
        </header>

        <ol className="grid gap-4 sm:gap-5 md:grid-cols-3">
          {steps.map(({ n, tag, title, body }) => (
            <li
              key={n}
              className="relative overflow-hidden rounded-3xl border border-eb-stroke/40 bg-eb-surface/90 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute right-5 top-3 text-[52px] font-extrabold leading-none tracking-[-0.03em] tabular-nums text-[rgb(var(--eb-shell-2)/0.28)]"
              >
                {n}
              </span>
              <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.06em] text-eb-accent">
                <span className="h-2 w-2 rounded-full bg-eb-accent" aria-hidden="true" />
                {tag}
              </span>
              <h3 className="text-lg font-bold text-eb-text">{title}</h3>
              <p className="mt-2 max-w-[32ch] text-sm leading-relaxed text-eb-text/65">
                {body}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex justify-center">
          <SecondaryLink to={appRoutes.howItWorksPublic} className="gap-2">
            {t("hiwCta")}
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </SecondaryLink>
        </div>
      </Wrap>
    </section>
  );
};

const Teaser: React.FC<{
  kicker: string;
  title: string;
  body: string;
  ctaLabel: string;
  to: string;
  peeks?: string[];
  ariaLabel: string;
}> = ({ kicker, title, body, ctaLabel, to, peeks, ariaLabel }) => (
  <section className="px-4 py-6 sm:px-6 sm:py-8" aria-label={ariaLabel}>
    <Wrap>
      <div
        className={[
          "grid items-center gap-6 rounded-3xl border border-eb-stroke/40 bg-eb-surface/85",
          "p-7 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-8 md:grid-cols-[1fr_auto] md:gap-8",
        ].join(" ")}
      >
        <div>
          <Kicker>{kicker}</Kicker>
          <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.015em] text-eb-text">
            {title}
          </h2>
          <p className="mt-3 max-w-[54ch] text-base leading-relaxed text-eb-text/65">
            {body}
          </p>
          {peeks && peeks.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {peeks.map((q) => (
                <li
                  key={q}
                  className="rounded-full border border-eb-stroke/30 bg-[rgb(var(--eb-shell)/0.4)] px-3 py-1.5 text-[13px] font-semibold text-eb-text/65"
                >
                  {q}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="md:justify-self-end">
          <SecondaryLink to={to} className="w-full justify-center gap-2 sm:w-auto">
            {ctaLabel}
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </SecondaryLink>
        </div>
      </div>
    </Wrap>
  </section>
);

const FinalCta: React.FC<{ t: T }> = ({ t }) => (
  <section className="px-4 pb-12 pt-8 sm:px-6 sm:pb-14" aria-label={t("finalKicker")}>
    <div
      className={[
        "mx-auto max-w-3xl rounded-[28px] border border-eb-stroke/40 px-8 py-10 text-center",
        "shadow-[0_16px_44px_rgba(15,23,42,0.07)] sm:px-10 sm:py-12",
      ].join(" ")}
      style={{
        background:
          "radial-gradient(120% 140% at 50% 0%, rgb(var(--eb-shell) / 0.6), rgb(var(--eb-surface) / 0.86) 62%)",
      }}
    >
      <Kicker>{t("finalKicker")}</Kicker>
      <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.015em] text-eb-text sm:text-[28px]">
        {t("finalTitle")}
      </h2>
      <p className="mx-auto mt-3 max-w-[46ch] text-base leading-relaxed text-eb-text/65">
        {t("finalBody")}
      </p>
      <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <CtaLink to={appRoutes.registration} className="h-12 px-6 text-base">
          {t("finalPrimary")}
        </CtaLink>
        <SecondaryLink to={appRoutes.login} className="h-12 px-6 text-base">
          {t("finalSecondary")}
        </SecondaryLink>
      </div>
    </div>
  </section>
);

// Privacy/Terms routes do not exist yet — legal page content is a later PR.
// Render the labels as inert placeholders so the footer reads correctly
// without shipping dead links to broken routes.
const FooterLegalPlaceholder: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="cursor-default text-eb-text/55">{children}</span>
);

const Footer: React.FC<{ t: T }> = ({ t }) => (
  <footer className="mt-10 border-t border-eb-stroke/30 px-4 py-7 sm:px-6">
    <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-[13px] text-eb-text/55 sm:flex-row sm:text-left">
      <span className="inline-flex items-center gap-2">
        <span className="font-extrabold tracking-tight text-eb-text">
          e<span className="text-eb-accent">B</span>udget
        </span>
        <span className="text-eb-text/40">{t("footerCopy")}</span>
      </span>
      <span className="inline-flex gap-5">
        <FooterLegalPlaceholder>{t("footerPrivacy")}</FooterLegalPlaceholder>
        <FooterLegalPlaceholder>{t("footerTerms")}</FooterLegalPlaceholder>
      </span>
    </div>
  </footer>
);

const DesktopHomePage: React.FC = () => {
  const locale = useAppLocale();
  const t: T = (k) => tDict(k, locale, homeDict);

  return (
    <div className="relative">
      <Hero t={t} />
      <BenefitRow t={t} />
      <HowItWorks t={t} />
      <Teaser
        kicker={t("aboutKicker")}
        title={t("aboutTitle")}
        body={t("aboutBody")}
        ctaLabel={t("aboutCta")}
        to={appRoutes.aboutUs}
        ariaLabel={t("aboutKicker")}
      />
      <Teaser
        kicker={t("faqKicker")}
        title={t("faqTitle")}
        body={t("faqBody")}
        ctaLabel={t("faqCta")}
        to={appRoutes.faq}
        peeks={[t("faqPeek1"), t("faqPeek2"), t("faqPeek3")]}
        ariaLabel={t("faqKicker")}
      />
      <FinalCta t={t} />
      <Footer t={t} />
    </div>
  );
};

export default DesktopHomePage;
