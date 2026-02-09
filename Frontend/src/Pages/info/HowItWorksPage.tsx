import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Sparkles,
    ShieldCheck,
    Calculator,
    Wallet,
    CreditCard,
    Target,
    ChevronDown,
} from "lucide-react";

import PageContainer from "@components/layout/PageContainer";
import { cn } from "@/lib/utils";

import { CtaButton } from "@components/atoms/buttons/CtaButton";
import { SecondaryLink } from "@/components/atoms/buttons/SecondaryLink";
import { useAuth } from "@hooks/auth/useAuth";

import ContentWrapperV2 from "@/components/layout/ContentWrapperV2";
import { SurfaceCard } from "@/components/atoms/cards/SurfaceCard";
import { Pill } from "@/components/atoms/badges/Pill";

type FaqItem = { q: string; a: string };

const faqs: FaqItem[] = [
    {
        q: "Måste jag ha allt exakt?",
        a: "Nej. Det räcker att du börjar. Du kan alltid justera senare när du ser helheten.",
    },
    {
        q: "Sparar ni mina siffror?",
        a: "Ja, men bara för att du ska kunna fortsätta och få en fungerande budget. Du kan ändra allt i efterhand.",
    },
    {
        q: "Kan jag avsluta och fortsätta senare?",
        a: "Ja. Du kan lämna mitt i och fortsätta där du slutade.",
    },
];

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
                <div className="rounded-2xl p-2 bg-eb-shell/70 border border-eb-stroke/30">
                    <Icon className="h-5 w-5 text-eb-text/75" />
                </div>

                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <span
                            className={cn(
                                "inline-flex items-center justify-center",
                                "h-5 min-w-5 px-2 rounded-full",
                                "bg-eb-shell/70 border border-eb-stroke/30",
                                "text-[11px] font-semibold text-eb-text/70"
                            )}
                        >
                            {step}
                        </span>
                        <div className="text-sm font-semibold text-eb-text">{title}</div>
                    </div>

                    <div className="mt-1 text-xs text-eb-text/65 leading-snug">{body}</div>
                </div>
            </div>
        </SurfaceCard>
    );
}

export default function HowItWorksPage() {
    const navigate = useNavigate();
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const auth = useAuth();
    const isLoggedIn = Boolean((auth as any)?.user || (auth as any)?.accessToken);

    const steps = useMemo(
        () => [
            { icon: Wallet, title: "Inkomster", body: "Lägg in vad som kommer in varje månad. Räcker med grovt först." },
            { icon: CreditCard, title: "Fasta utgifter", body: "Hyra, el, abonnemang. Sen ser du direkt vad som faktiskt finns kvar." },
            { icon: Target, title: "Mål: buffert / skulder / spar", body: "Du väljer fokus. Vi gör det tydligt vad som är rimligt, utan stress." },
            { icon: Calculator, title: "Klar — din dashboard blir levande", body: "Du får en månad som går att följa, justera och förbättra över tid." },
        ],
        []
    );

    const onPrimaryCta = () => {
        if (isLoggedIn) navigate("/dashboard?wizard=1");
        else navigate("/registration");
    };

    const backTo = isLoggedIn ? "/dashboard" : "/about-us";
    const secondaryTo = isLoggedIn ? "/dashboard" : "/login";
    const secondaryLabel = isLoggedIn ? "Till dashboard" : "Logga in";
    const ctaLabel = isLoggedIn ? "Skapa budget (3–5 min)" : "Registrera dig";

    return (
        <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full" noPadding>
            {/* make wrapper actually match your max width */}
            <ContentWrapperV2 size="xl">
                <SurfaceCard tone="shell" className="px-4 py-6 md:px-6 md:py-8 rounded-[28px]">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-3 justify-between">
                        <Link
                            to={backTo}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-eb-text/70 hover:text-eb-text"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Tillbaka
                        </Link>

                        {/* reuse Pill as a “meta chip” (just shrink it) */}
                        <Pill className="h-7 px-3 text-[11px] bg-eb-surface/75 border-eb-stroke/30 text-eb-text/70">
                            <Sparkles className="h-4 w-4" />
                            1 minut • överblick
                        </Pill>
                    </div>

                    {/* Hero + steps */}
                    <div className="mt-5 grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-6">
                        {/* Hero uses SurfaceCard too (no duplicated styling) */}
                        <SurfaceCard
                            className={cn(
                                "relative overflow-hidden p-0",
                                "shadow-[0_24px_70px_rgba(21,39,81,0.12)]"
                            )}
                        >
                            {/* Soft surface wash (white → light blue) */}
                            <div
                                className={cn(
                                    "absolute inset-0",
                                    "bg-gradient-to-b",
                                    "from-[rgb(var(--eb-surface)/0.96)]",
                                    "via-[rgb(var(--eb-surface)/0.90)]",
                                    "to-[rgb(var(--eb-shell)/0.55)]"
                                )}
                            />
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_65%_at_18%_12%,rgba(77,185,254,0.18)_0%,transparent_55%)]" />
                            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/60" />

                            <div className="relative p-6 md:p-8">
                                <div className="inline-flex items-center gap-2 rounded-full bg-eb-shell/60 border border-eb-stroke/30 px-3 py-1 text-[11px] md:text-xs font-semibold text-eb-text/70">
                                    <ShieldCheck className="h-4 w-4" />
                                    Privat & enkelt — du kan ändra allt senare
                                </div>

                                <h1 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight text-eb-text">
                                    Så funkar eBudget
                                </h1>

                                <p className="mt-2 text-sm md:text-base text-eb-text/70 max-w-xl">
                                    Du matar in några siffror. Vi räknar ut ditt andrum och gör det tydligt
                                    vad du kan lägga på livet — utan stress.
                                </p>

                                <div className="mt-6 flex flex-wrap items-center gap-3">
                                    <CtaButton onClick={onPrimaryCta}>
                                        <span className="inline-flex items-center gap-2">
                                            <Sparkles className="h-5 w-5" />
                                            {ctaLabel}
                                        </span>
                                    </CtaButton>

                                    {/* ✅ standardize secondary */}
                                    <SecondaryLink to={secondaryTo}>
                                        {secondaryLabel}
                                        <span aria-hidden="true" className="ml-2 translate-y-[1px]">→</span>
                                    </SecondaryLink>
                                </div>
                            </div>
                        </SurfaceCard>

                        <aside className="grid gap-4">
                            {steps.map((s, i) => (
                                <StepCard key={s.title} icon={s.icon} step={i + 1} title={s.title} body={s.body} />
                            ))}
                        </aside>
                    </div>

                    {/* FAQ + Tips */}
                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <SurfaceCard className="p-5">
                            <div className="text-sm font-semibold text-eb-text">Vanliga frågor</div>

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
                                                "w-full text-left rounded-2xl border transition",
                                                "focus-visible:outline-none focus-visible:ring-4 ring-eb-accent/25",
                                                open
                                                    ? "bg-eb-surface/90 border-eb-stroke/40"
                                                    : "bg-eb-surface/60 border-eb-stroke/30 hover:bg-eb-surface/80"
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3 px-4 py-3">
                                                <span className="text-xs md:text-sm font-semibold text-eb-text/90">
                                                    {x.q}
                                                </span>
                                                <ChevronDown
                                                    className={cn(
                                                        "h-4 w-4 text-eb-text/60 transition-transform",
                                                        open && "rotate-180"
                                                    )}
                                                />
                                            </div>

                                            {open && (
                                                <div id={contentId} className="px-4 pb-4 text-xs md:text-sm text-eb-text/70 leading-relaxed">
                                                    {x.a}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </SurfaceCard>

                        <SurfaceCard className="p-5">
                            <div className="text-sm font-semibold text-eb-text">Tips</div>

                            <ul className="mt-3 space-y-2 text-xs md:text-sm text-eb-text/70">
                                <li>• Börja grovt. Justera efteråt när du ser helheten.</li>
                                <li>• Lägg in fasta utgifter först — där blir insikten tydligast.</li>
                                <li>• Välj fokus (buffert/skuld/spar) och håll det enkelt i början.</li>
                            </ul>

                            <div className="mt-4">
                                <CtaButton onClick={onPrimaryCta} className="w-full">
                                    {isLoggedIn ? "Skapa budget nu" : "Registrera dig"}
                                </CtaButton>
                            </div>
                        </SurfaceCard>
                    </div>
                </SurfaceCard>
            </ContentWrapperV2>
        </PageContainer>
    );
}
