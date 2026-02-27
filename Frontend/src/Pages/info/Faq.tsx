import * as React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Lock,
  Download,
  ShieldCheck,
  Users,
  Coins,
  Mail,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

import PageContainer from "@components/layout/PageContainer";
import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import Mascot from "@/components/atoms/animation/Mascot";

import faqBird from "@assets/Images/FaqBird.png";

import { cn } from "@/lib/utils";
import { CtaLink } from "@/components/atoms/buttons/CtaLink";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { ctaBaseClass, secondaryActionClass } from "@/components/atoms/buttons/ctaStyles";

type FaqItem = {
  id: string;
  icon: React.ReactNode;
  q: string;
  a: React.ReactNode;
};

export default function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const items = useMemo<FaqItem[]>(
    () => [
      {
        id: "how",
        icon: <LayoutGrid className="h-5 w-5 text-eb-accent" />,
        q: "Hur fungerar budgetering i eBudget?",
        a: (
          <div className="space-y-2">
            <p>
              Du fyller i inkomster och fasta utgifter först. Sen ser du direkt vad som finns kvar att fördela
              — och kan justera när du vill. Inget behöver vara perfekt från start.
            </p>
            <Link
              to="/how-it-works"
              className={cn(
                "inline-flex items-center gap-2 font-semibold",
                "text-eb-text hover:text-eb-text/80",
                "underline underline-offset-4 decoration-eb-stroke/60"
              )}
            >
              Se vår visuella guide här <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ),
      },
      {
        id: "security",
        icon: <Lock className="h-5 w-5 text-eb-text/75" />,
        q: "Är min data säker i eBudget?",
        a: (
          <div className="space-y-2">
            <p>
              Integritet är grundkravet. Vi bygger för minsta möjliga exponering och delar inte din data vidare.
              Du har kontroll och kan alltid ändra dina siffror.
            </p>
            <p className="text-eb-text/60">
              (Om du vill ha detaljer om hur vi hanterar säkerhet i den version du använder: mejla oss.)
            </p>
          </div>
        ),
      },
      {
        id: "export",
        icon: <Download className="h-5 w-5 text-eb-text/75" />,
        q: "Kan jag exportera mina data?",
        a: (
          <div className="space-y-2">
            <p>
              Ja — du ska kunna ta med dig dina siffror. Om export inte är aktiverad i din version ännu,
              så hjälper vi dig personligen via mejl.
            </p>
          </div>
        ),
      },
      {
        id: "cost",
        icon: <Coins className="h-5 w-5 text-eb-text/75" />,
        q: "Vad kostar eBudget?",
        a: (
          <div className="space-y-2">
            <p>
              Inga överraskningar. Eventuellt pris/premium visas alltid tydligt innan du väljer att uppgradera.
              Du kan börja lugnt och känna efter.
            </p>
          </div>
        ),
      },
      {
        id: "sharing",
        icon: <Users className="h-5 w-5 text-eb-text/75" />,
        q: "Kan jag använda eBudget med flera användare?",
        a: (
          <div className="space-y-2">
            <p>
              Ja, målet är att det ska fungera bra för hushåll/partner. Delning ska vara tydlig och trygg
              — med klara rättigheter.
            </p>
          </div>
        ),
      },
      {
        id: "data",
        icon: <ShieldCheck className="h-5 w-5 text-eb-accent" />,
        q: "Säljer ni min data?",
        a: (
          <div className="space-y-2">
            <p>
              Nej. Aldrig. Vi bygger eBudget för lugn och kontroll — inte för att maximera datainsamling.
            </p>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <PageContainer noPadding className="relative">
      {/* smaller “abstract circles” header grounding */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-56 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[rgb(var(--eb-shell)/0.45)] blur-2xl" />
        <div className="absolute -top-28 left-[12%] h-56 w-56 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute -top-28 right-[10%] h-64 w-64 rounded-full bg-[rgb(var(--eb-shell)/0.30)] blur-2xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/50" />
      </div>

      <ContentWrapperV2 size="xl" className="relative pt-10 sm:pt-14 pb-14 sm:pb-16">
        {/* Top row: small nav hint */}
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-eb-text/70 inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Svar på det som brukar stoppa folk från att komma igång
          </div>

          <div className="hidden sm:flex gap-2">
            <SecondaryLink to="/about-us">Om oss</SecondaryLink>
            <SecondaryLink to="/how-it-works">Hur det fungerar</SecondaryLink>
          </div>
        </div>

        {/* Main layout */}
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_340px] md:items-start">
          {/* FAQ card */}
          <SurfaceCard className="p-5 sm:p-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-eb-text">
              Vanliga frågor
            </h1>
            <p className="mt-2 text-sm text-eb-text/65 max-w-prose">
              Finansappar = rimliga frågor. Här är de viktigaste, rakt på sak.
            </p>

            <div className="mt-5 space-y-2">
              {items.map((x, idx) => {
                const open = openIdx === idx;
                const contentId = `faq-${x.id}`;
                return (
                  <div
                    key={x.id}
                    className={cn(
                      "rounded-2xl border",
                      "border-eb-stroke/30",
                      open ? "bg-eb-surface/90" : "bg-eb-surface/70 hover:bg-eb-surface/85"
                    )}
                  >
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={contentId}
                      onClick={() => setOpenIdx(open ? null : idx)}
                      className={cn(
                        "w-full text-left px-4 py-3",
                        "flex items-center justify-between gap-3",
                        "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/25"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-eb-shell/60 border border-eb-stroke/25">
                          {x.icon}
                        </span>
                        <span className="font-semibold text-eb-text/90 text-sm sm:text-base truncate">
                          {x.q}
                        </span>
                      </div>

                      <ChevronDown
                        className={cn(
                          "h-5 w-5 shrink-0 text-eb-text/60 transition-transform",
                          open && "rotate-180"
                        )}
                      />
                    </button>

                    {open && (
                      <div
                        id={contentId}
                        className="px-4 pb-4 text-sm text-eb-text/70 leading-relaxed"
                      >
                        {x.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* conversion/support callout */}
            <div className="mt-6 rounded-2xl bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25 p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-eb-surface/80 border border-eb-stroke/25">
                  <Mail className="h-5 w-5 text-eb-text/70" />
                </span>

                <div className="min-w-0">
                  <div className="text-sm font-bold text-eb-text">Har du fler frågor?</div>
                  <div className="mt-1 text-sm text-eb-text/65">
                    Mejla oss så hjälper vi dig. Inga tickets, inga robotar.
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    {/* public-friendly: mailto instead of protected /support */}
                    <a
                      href="mailto:info@ebudget.se?subject=eBudget%20-%20Fr%C3%A5ga"
                      className={cn(ctaBaseClass, "h-11 px-5 rounded-2xl")}
                    >
                      Kontakta oss
                    </a>

                    <a
                      href="mailto:info@ebudget.se?subject=eBudget%20-%20Fr%C3%A5ga"
                      className={cn(secondaryActionClass, "h-11 px-5 rounded-2xl")}
                    >
                      info@ebudget.se
                    </a>
                  </div>

                  {/* “Human element” trust line */}
                  <div className="mt-2 text-xs text-eb-text/55">
                    Vi svarar personligen inom 24 timmar.
                  </div>

                  {/* small conversion nudge */}
                  <div className="mt-4">
                    <CtaLink to="/registration">Skaffa eBudget</CtaLink>
                  </div>
                </div>
              </div>
            </div>
          </SurfaceCard>

          {/* Mascot side */}
          <div className="relative flex justify-center md:justify-end">
            <div className="relative md:mt-12">
              <div className="pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(65%_65%_at_50%_40%,rgba(77,185,254,0.14)_0%,transparent_70%)]" />
              <Mascot src={faqBird} alt="" size={220} mdSize={300} float shadow />
            </div>
          </div>
        </div>
      </ContentWrapperV2>
    </PageContainer>
  );
}
