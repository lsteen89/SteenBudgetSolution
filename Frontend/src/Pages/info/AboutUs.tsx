import Mascot from "@/components/atoms/animation/Mascot";
import { Pill } from "@/components/atoms/badges/Pill";
import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { InfoCard } from "@/components/atoms/cards/InfoCard";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { aboutUsDict } from "@/utils/i18n/pages/public/AboutUs.i18n";
import { tDict } from "@/utils/i18n/translate";
import AboutUsBird from "@assets/Images/GuideBirdHappy.png";
import ContentWrapperV2 from "@components/layout/ContentWrapperV2";
import PageContainer from "@components/layout/PageContainer";
import { ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

export default function AboutUs() {
  const locale = useAppLocale();
  const t = <K extends keyof typeof aboutUsDict.sv>(k: K) =>
    tDict(k, locale, aboutUsDict);

  return (
    <PageContainer noPadding>
      <main className="relative w-full">
        {/* shell wash */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(var(--eb-shell)/0.22)] to-transparent" />

        <ContentWrapperV2
          size="xl"
          className="relative pt-10 sm:pt-14 pb-12 sm:pb-16"
        >
          {/* HERO */}
          <div className="grid gap-8 md:gap-6 lg:gap-10 md:grid-cols-[1.15fr_0.85fr] md:items-center">
            <SurfaceCard className="p-6 sm:p-8">
              <p className="text-xs font-semibold tracking-[0.22em] uppercase text-eb-text/50">
                {t("missionKicker")}
              </p>

              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-eb-text">
                {t("heroTitleA")}{" "}
                <span className="text-eb-accent">{t("heroTitleAccent")}</span>{" "}
                {t("heroTitleB")}
              </h1>

              <p className="mt-4 text-base leading-relaxed text-eb-text/70 max-w-prose">
                {t("heroBody")}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <CtaLink to="/registration">{t("ctaGet")}</CtaLink>
                <SecondaryLink to="/how-it-works">{t("ctaHow")}</SecondaryLink>
              </div>

              <div className="mt-7 rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 px-4 py-3">
                <p className="text-sm text-eb-text/60">{t("privacyLine")}</p>
              </div>
            </SurfaceCard>

            {/* MASCOT */}
            <div className="relative flex justify-center md:justify-start md:-ml-6 lg:-ml-10">
              <div className="relative mt-6 md:mt-0 md:translate-y-10 lg:translate-y-14">
                {/* soft halo (shifted slightly toward the card) */}
                <div
                  className="pointer-events-none absolute -inset-16 rounded-full
      bg-[radial-gradient(60%_60%_at_40%_40%,rgba(77,185,254,0.16)_0%,transparent_72%)]"
                />

                {/* “stage” shadow so it’s not floating */}
                <div
                  className="pointer-events-none absolute left-1/2 top-full mt-3
      h-10 w-56 -translate-x-1/2 rounded-full
      bg-[rgb(var(--eb-text)/0.08)] blur-xl"
                />

                <Mascot
                  src={AboutUsBird}
                  alt=""
                  size={220} // phones
                  mdSize={400} // md and up
                  float
                  shadow
                />
              </div>
            </div>
          </div>

          {/* VALUES */}
          <div className="mt-10 sm:mt-12">
            <h2 className="text-lg font-bold text-eb-text">
              {t("valuesTitle")}
            </h2>
            <p className="mt-1 text-sm text-eb-text/65 max-w-prose">
              {t("valuesLead")}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <InfoCard
                icon={<ShieldCheck className="h-5 w-5 text-eb-accent" />}
                title={t("v1Title")}
                text={t("v1Text")}
              />
              <InfoCard
                icon={<Sparkles className="h-5 w-5 text-eb-accent" />}
                title={t("v2Title")}
                text={t("v2Text")}
              />
              <InfoCard
                icon={<TrendingUp className="h-5 w-5 text-eb-accent" />}
                title={t("v3Title")}
                text={t("v3Text")}
              />
            </div>
          </div>

          {/* BUILT LIKE A PRODUCT */}
          <SurfaceCard className="p-6 sm:p-8 mt-10 sm:mt-12">
            <h2 className="text-lg font-bold text-eb-text">
              {t("productTitle")}
            </h2>
            <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
              {t("productLead")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Pill>{t("pill1")}</Pill>
              <Pill>{t("pill2")}</Pill>
              <Pill>{t("pill3")}</Pill>
              <Pill>{t("pill4")}</Pill>
            </div>

            <div className="mt-6">
              <CtaLink to="/registration">{t("ctaStart")}</CtaLink>
            </div>
          </SurfaceCard>
        </ContentWrapperV2>
      </main>
    </PageContainer>
  );
}
