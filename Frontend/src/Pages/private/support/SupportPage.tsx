import Mascot from "@/components/atoms/animation/Mascot";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import PageContainer from "@/components/layout/PageContainer";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { supportDict } from "@/utils/i18n/pages/private/support/support.i18n";
import { tDict } from "@/utils/i18n/translate";
import MailBird from "@assets/Images/ContactUsBird.png";
import React from "react";
import { SupportContactForm } from "./SupportContactForm";
import { SupportFaq } from "./SupportFaq";
import type { SupportT } from "./support.types";

export default function SupportPage() {
  const locale = useAppLocale();

  const t = React.useCallback<SupportT>(
    (k) => tDict(k, locale, supportDict),
    [locale],
  );

  return (
    <PageContainer noPadding className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-24 left-[10%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-24 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
      </div>

      <ContentWrapperV2
        size="xl"
        className="relative pt-10 sm:pt-14 pb-12 sm:pb-16"
      >
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,440px)]">
            <div className="space-y-6">
              <SurfaceCard className="p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-eb-text/50">
                  {t("kicker")}
                </p>

                <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-eb-text">
                  {t("titleA")}{" "}
                  <span className="text-eb-accent">{t("titleBrand")}</span>
                </h1>

                <p className="mt-2 max-w-prose text-sm text-eb-text/65">
                  {t("lead")}
                </p>
              </SurfaceCard>

              <SupportFaq t={t} />
            </div>

            <div className="relative">
              <SurfaceCard className="relative overflow-hidden p-6 sm:p-8">
                <div
                  aria-hidden="true"
                  className="pointer-events-none hidden xl:block absolute inset-0"
                >
                  <div className="absolute right-[-18px] bottom-[-56px] opacity-[0.12]">
                    <Mascot
                      src={MailBird}
                      alt=""
                      size={210}
                      mdSize={250}
                      shadow={false}
                    />
                  </div>
                </div>

                <div className="relative z-10">
                  <SupportContactForm t={t} />
                </div>
              </SurfaceCard>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none mt-8 flex justify-center xl:hidden"
          >
            <Mascot
              src={MailBird}
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
