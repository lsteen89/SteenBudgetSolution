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
import ContentWrapper from "@components/layout/ContentWrapper";
import LimePrimaryButton from "@components/atoms/buttons/LimePrimaryButton";
import clsx from "clsx";

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
    title,
    body,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    body: string;
}) {
    return (
        <div className="rounded-3xl bg-white/70 backdrop-blur border border-white/50 shadow-lg px-5 py-4">
            <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-900/5 border border-white/50 p-2">
                    <Icon className="h-5 w-5 text-emerald-900/80" />
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-emerald-950">{title}</div>
                    <div className="mt-1 text-xs text-emerald-950/75 leading-snug">{body}</div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardHowItWorksPage() {
    const navigate = useNavigate();
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    const steps = useMemo(
        () => [
            {
                icon: Wallet,
                title: "1) Inkomster",
                body: "Lägg in vad som kommer in varje månad. Räcker med grovt först.",
            },
            {
                icon: CreditCard,
                title: "2) Fasta utgifter",
                body: "Hyra, el, abonnemang. Sen ser du direkt vad som faktiskt finns kvar.",
            },
            {
                icon: Target,
                title: "3) Mål: buffert / skulder / spar",
                body: "Du väljer fokus. Vi gör det tydligt vad som är rimligt, utan stress.",
            },
            {
                icon: Calculator,
                title: "4) Klar — din dashboard blir levande",
                body: "Du får en månad som går att följa, justera och förbättra över tid.",
            },
        ],
        []
    );

    const onStart = () => {
        navigate("/dashboard?wizard=1");
    };

    return (
        <PageContainer className="md:px-20 items-center min-h-screen overflow-y-auto h-full">
            <ContentWrapper centerContent className="lg:pt-24 3xl:pt-48">
                <div className="w-full max-w-6xl">
                    <div className="rounded-[28px] bg-white/40 backdrop-blur border border-white/50 shadow-xl px-4 py-6 md:px-6 md:py-8">
                        {/* Header */}
                        <div className="flex flex-wrap items-center gap-3 justify-between">
                            <Link
                                to="/dashboard"
                                className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-950/80 hover:text-emerald-950"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Tillbaka
                            </Link>

                            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 border border-white/50 px-3 py-1 text-[11px] md:text-xs font-semibold text-emerald-950/80">
                                <Sparkles className="h-4 w-4" />
                                1 minut • överblick
                            </div>
                        </div>

                        {/* Hero */}
                        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-6">
                            <section className="relative overflow-hidden rounded-3xl border border-white/40 shadow-2xl">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/80 via-emerald-500/75 to-sky-400/70" />
                                <div className="pointer-events-none absolute inset-0 bg-white/5" />
                                <div className="relative p-6 md:p-8 text-white">
                                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-950/25 border border-white/15 px-3 py-1 text-[11px] md:text-xs font-semibold shadow-sm">
                                        <ShieldCheck className="h-4 w-4" />
                                        Privat & enkelt — du kan ändra allt senare
                                    </div>

                                    <h1 className="mt-4 text-2xl md:text-3xl font-semibold tracking-tight">
                                        Så funkar eBudget
                                    </h1>
                                    <p className="mt-2 text-sm md:text-base opacity-95 max-w-xl">
                                        Du matar in några siffror. Vi räknar ut ditt andrum och gör det tydligt
                                        vad du kan lägga på livet — utan stress.
                                    </p>

                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        <div className="relative inline-flex">
                                            <div className="pointer-events-none absolute -inset-1 rounded-full bg-limeGreen/40 blur-xl opacity-70" />
                                            <LimePrimaryButton
                                                onClick={onStart}
                                                className="relative border border-emerald-900/10 ring-1 ring-white/20 shadow-lg shadow-emerald-900/25"
                                            >
                                                <span className="inline-flex items-center gap-2">
                                                    <Sparkles className="h-5 w-5" />
                                                    Skapa budget (3–5 min)
                                                </span>
                                            </LimePrimaryButton>
                                        </div>

                                        <Link
                                            to="/dashboard"
                                            className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 backdrop-blur px-4 py-2 text-xs md:text-sm font-semibold text-white hover:bg-white/20 transition"
                                        >
                                            Till dashboard
                                            <span aria-hidden="true" className="translate-y-[1px]">→</span>
                                        </Link>
                                    </div>
                                </div>
                            </section>

                            {/* Steps */}
                            <aside className="grid gap-4">
                                {steps.map((s) => (
                                    <StepCard key={s.title} icon={s.icon} title={s.title} body={s.body} />
                                ))}
                            </aside>
                        </div>

                        {/* FAQ */}
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="rounded-3xl bg-white/70 backdrop-blur border border-white/50 shadow-lg p-5">
                                <div className="text-sm font-semibold text-emerald-950">Vanliga frågor</div>

                                <div className="mt-3 space-y-2">
                                    {faqs.map((x, idx) => {
                                        const open = openIdx === idx;
                                        return (
                                            <button
                                                key={x.q}
                                                type="button"
                                                onClick={() => setOpenIdx(open ? null : idx)}
                                                className={clsx(
                                                    "w-full text-left rounded-2xl border backdrop-blur transition",
                                                    open ? "bg-white/70 border-white/60" : "bg-white/40 border-white/50 hover:bg-white/60"
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3 px-4 py-3">
                                                    <span className="text-xs md:text-sm font-semibold text-emerald-950/90">
                                                        {x.q}
                                                    </span>
                                                    <ChevronDown
                                                        className={clsx("h-4 w-4 text-emerald-950/70 transition-transform", open && "rotate-180")}
                                                    />
                                                </div>
                                                {open && (
                                                    <div className="px-4 pb-4 text-xs md:text-sm text-emerald-950/75 leading-relaxed">
                                                        {x.a}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="rounded-3xl bg-white/70 backdrop-blur border border-white/50 shadow-lg p-5">
                                <div className="text-sm font-semibold text-emerald-950">Tips</div>
                                <ul className="mt-3 space-y-2 text-xs md:text-sm text-emerald-950/75">
                                    <li>• Börja grovt. Justera efteråt när du ser helheten.</li>
                                    <li>• Lägg in fasta utgifter först — där blir insikten tydligast.</li>
                                    <li>• Välj fokus (buffert/skuld/spar) och håll det enkelt i början.</li>
                                </ul>

                                <div className="mt-4">
                                    <LimePrimaryButton onClick={onStart} className="w-full">
                                        Skapa budget nu
                                    </LimePrimaryButton>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </ContentWrapper>
        </PageContainer>
    );
}
