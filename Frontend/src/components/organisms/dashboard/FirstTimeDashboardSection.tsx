import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, PencilLine, ShieldCheck, Sparkles, Timer, CheckCircle2 } from "lucide-react";
import PlayfulBirdCard from "@components/molecules/cards/dashboard/PlayfulBirdCard";
import LimePrimaryButton from "@components/atoms/buttons/LimePrimaryButton";

import GoalBird from "@assets/Images/GoalBird.png";
import CalcBird from "@assets/Images/CalcBird.png";
import RichBird from "@assets/Images/RichBird.png";


export interface FirstTimeDashboardSectionProps {
    onStartWizard: () => void;
    canResumeWizard?: boolean;
    onResumeWizard?: () => void;
}

function Chip({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode; }) {
    return (
        <div
            className="
        inline-flex items-center gap-2 rounded-full
        bg-white/20 border border-white/20
        px-3 py-1 text-[11px] md:text-xs font-semibold
        shadow-sm shadow-emerald-900/10
        backdrop-blur
      "
        >
            <Icon className="h-4 w-4 opacity-95" />
            <span className="opacity-95">{children}</span>
        </div>
    );
}

const FirstTimeDashboardSection: React.FC<FirstTimeDashboardSectionProps> = ({
    onStartWizard,
    onResumeWizard,
    canResumeWizard = false,
}) => {
    const [showWhy, setShowWhy] = useState(false);

    const primaryCta = canResumeWizard && onResumeWizard
        ? { label: "Fortsätt där du slutade", onClick: onResumeWizard }
        : { label: "Skapa budget (3–5 min)", onClick: () => onStartWizard() };

    return (
        <div className="w-full">
            {/* Page shell: matches your app’s soft glass look */}
            <div className="mx-auto max-w-6xl">
                <div className="rounded-[28px] bg-white/40 backdrop-blur border border-white/50 shadow-xl px-4 py-6 md:px-6 md:py-8">
                    <div className="w-full max-w-5xl space-y-6 lg:space-y-8">
                        <div className="grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-6">
                            {/* HERO */}
                            <section className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/30 ring-1 ring-white/10">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/85 via-emerald-500/80 to-sky-400/75" />
                                <div className="pointer-events-none absolute inset-0 bg-white/5" /> {/* soft wash */}
                                <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

                                <div className="relative px-6 py-8 md:px-8 md:py-10 text-white">
                                    {/* Badges */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="inline-flex items-center gap-2 text-[11px] md:text-xs font-semibold bg-emerald-950/25 border border-white/15 rounded-full px-3 py-1 w-max shadow-sm">
                                            <span className="h-2 w-2 rounded-full bg-emerald-200 animate-pulse" />
                                            Första gången här – vi tar det steg för steg.
                                        </div>

                                        <Chip icon={Timer}>3–5 min</Chip>
                                        <Chip icon={ShieldCheck}>Privat & enkelt</Chip>
                                        <Chip icon={PencilLine}>Ändra allt senare</Chip>
                                    </div>

                                    {/* Headline */}
                                    <div className="mt-4 space-y-2">
                                        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                                            Bygg din första budget på riktigt <span aria-hidden="true">🎉</span>
                                        </h1>
                                        <p className="text-sm md:text-base opacity-95 max-w-xl">
                                            Du matar in några siffror. Vi räknar ut ditt andrum och gör det tydligt vad du kan lägga på livet — utan stress.
                                        </p>
                                    </div>

                                    {/* Bullets */}
                                    <div className="mt-5 grid gap-2">
                                        {[
                                            { t: "Se vad som faktiskt finns kvar", d: "— efter fasta utgifter" },
                                            { t: "Välj fokus", d: "buffert, skulder eller sparande" },
                                            { t: "Justera när livet ändras", d: "inget är låst" },
                                        ].map((x) => (
                                            <div
                                                key={x.t}
                                                className="flex items-start gap-2 rounded-2xl bg-white/10 border border-white/10 px-3 py-2 backdrop-blur"
                                            >
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-100/90 shrink-0" />
                                                <div className="text-xs md:text-sm leading-snug">
                                                    <span className="font-semibold">{x.t}</span>{" "}
                                                    <span className="opacity-95">{x.d}.</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Step preview (move ABOVE buttons) */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] md:text-xs">
                                        {["Inkomster", "Utgifter", "Sparande & skulder", "Klart"].map((t, i) => (
                                            <div
                                                key={t}
                                                className="
                                                rounded-xl bg-white/15 backdrop-blur px-3 py-2
                                                border border-white/15
                                                shadow-sm shadow-emerald-900/10
                                            "
                                            >
                                                <span className="opacity-85">Steg {i + 1}</span>
                                                <div className="font-semibold">{t}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTAs */}
                                    <div className="mt-4 space-y-3">
                                        {/* Row 1 */}
                                        <div className="flex flex-wrap items-center gap-3">
                                            <div className="relative inline-flex">
                                                {/* glow */}
                                                <div className="pointer-events-none absolute -inset-1 rounded-full bg-limeGreen/40 blur-xl opacity-70" />
                                                <LimePrimaryButton
                                                    onClick={primaryCta.onClick}
                                                    className="
                                                    relative
                                                    border border-emerald-900/10
                                                    ring-1 ring-white/20
                                                    shadow-lg shadow-emerald-900/25
                                                    hover:shadow-xl hover:shadow-emerald-900/30
                                                    "
                                                >
                                                    <span className="inline-flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                                        <span>{primaryCta.label}</span>
                                                    </span>
                                                </LimePrimaryButton>
                                            </div>

                                            <Link
                                                to="/dashboard/how-it-works"
                                                className="
                                                inline-flex items-center gap-2 rounded-full
                                                bg-white/15 text-white
                                                border border-white/25
                                                ring-1 ring-white/10
                                                px-4 py-2 text-xs md:text-sm font-semibold
                                                shadow-sm shadow-emerald-900/10
                                                hover:bg-white/20 hover:-translate-y-[1px]
                                                active:translate-y-0
                                                transition
                                                "
                                            >
                                                Se snabbguide <span className="opacity-90 font-medium">(1 min)</span>
                                                <span aria-hidden="true" className="translate-y-[1px]">→</span>
                                            </Link>
                                        </div>

                                        {/* Row 2: Why toggle BELOW buttons */}
                                        <button
                                            type="button"
                                            onClick={() => setShowWhy((v) => !v)}
                                            className="
                                            w-full inline-flex items-center justify-between gap-2
                                            rounded-2xl bg-white/10 border border-white/15 backdrop-blur
                                            px-4 py-3 text-xs md:text-sm font-semibold text-white/90
                                            hover:bg-white/15 hover:text-white transition
                                            "
                                            aria-expanded={showWhy}
                                        >
                                            <span>Varför frågar vi?</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform ${showWhy ? "rotate-180" : ""}`} />
                                        </button>

                                        {showWhy && (
                                            <div className="rounded-2xl bg-white/10 border border-white/10 p-4 text-xs md:text-sm leading-relaxed">
                                                Vi frågar om inkomst, fasta utgifter och mål för att kunna räkna ut en realistisk budget.
                                                Du kan fylla i i din takt och justera allt senare – det viktiga är att komma igång.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* BENEFITS */}
                            <aside className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
                                <PlayfulBirdCard
                                    className="
                                        bg-gradient-to-br from-emerald-50/80 via-white/70 to-sky-50/70
                                        border border-white/60
                                        hover:ring-1 hover:ring-emerald-900/10 hover:bg-white/80
                                        "
                                    title="Få koll på verkligheten"
                                    description="Vi räknar ut vad du faktiskt har kvar efter fasta utgifter — inga gissningar."
                                    imageSrc={CalcBird}
                                />

                                <PlayfulBirdCard
                                    className="
                                        bg-gradient-to-br from-sky-50/80 via-white/70 to-emerald-50/70
                                        border border-white/60
                                        hover:ring-1 hover:ring-emerald-900/10 hover:bg-white/80
                                        "
                                    title="Sätt en plan som håller"
                                    description="Välj fokus (spara, skulder, buffert) och få en tydlig månad som känns rimlig."
                                    ctaLabel="Skapa en budget!"
                                    onClick={onStartWizard}
                                    imageSrc={GoalBird}
                                />

                                <PlayfulBirdCard
                                    className="
                                        bg-gradient-to-br from-emerald-50/80 via-white/70 to-lime-50/70
                                        border border-white/60
                                        hover:ring-1 hover:ring-emerald-900/10 hover:bg-white/80
                                        "
                                    title="Bygg en buffert utan stress"
                                    description="Små steg som gör att oväntade kostnader blir irriterande — inte katastrof."
                                    imageSrc={RichBird}
                                />
                            </aside>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirstTimeDashboardSection;
