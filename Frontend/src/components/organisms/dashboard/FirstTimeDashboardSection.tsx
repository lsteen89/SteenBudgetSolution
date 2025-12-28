import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import PlayfulBirdCard from "@components/molecules/cards/dashboard/PlayfulBirdCard";
import LimePrimaryButton from "@components/atoms/buttons/LimePrimaryButton";

import GoalBird from "@assets/Images/GoalBird.png";
import CalcBird from "@assets/Images/CalcBird.png";
import RichBird from "@assets/Images/RichBird.png";

export interface FirstTimeDashboardSectionProps {
    onStartWizard: () => void;
}

const FirstTimeDashboardSection: React.FC<FirstTimeDashboardSectionProps> = ({ onStartWizard }) => {
    return (
        <div className="w-full max-w-5xl space-y-8 lg:space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-[3fr,2fr] gap-6">
                <div className="relative rounded-3xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400 text-white px-6 py-8 shadow-2xl overflow-hidden">
                    <div className="pointer-events-none absolute inset-y-0 right-[-40%] w-1/2 bg-emerald-300/30 blur-3xl" />

                    <div className="relative flex flex-col gap-4">
                        <div className="inline-flex items-center gap-2 text-[11px] font-medium bg-emerald-900/25 rounded-full px-3 py-1 w-max">
                            <span className="h-2 w-2 rounded-full bg-emerald-200 animate-pulse" />
                            Första gången här – bra jobbat att du tog första steget.
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl md:text-3xl font-semibold flex items-center gap-2">
                                Välkommen till eBudget <span aria-hidden="true">🎉</span>
                            </h1>
                            <p className="text-sm md:text-base opacity-95 max-w-md">
                                Här hjälper vi dig att få kontroll på pengarna utan dåligt samvete eller excel-ångest.
                                Guiden tar dig igenom allt steg för steg.
                            </p>
                        </div>

                        <ul className="text-xs md:text-sm opacity-95 list-disc list-inside space-y-1">
                            <li>Bestäm vad som faktiskt är viktigt för dig</li>
                            <li>Skapa din första budget på några minuter</li>
                            <li>Bygg en buffert så oväntade kostnader inte stressar sönder dig</li>
                        </ul>

                        <p className="text-xs md:text-sm opacity-90">
                            Du kan alltid ändra allt i efterhand – det viktiga är att du kommer igång.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <LimePrimaryButton
                                onClick={onStartWizard}
                                className="px-5 py-3 rounded-full shadow-lg shadow-emerald-900/30 hover:shadow-emerald-900/40 hover:-translate-y-[1px] text-sm md:text-base"
                            >
                                <span className="inline-flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 md:w-5 md:h-5" />
                                    <span>Starta din guidade resa</span>
                                </span>
                            </LimePrimaryButton>

                            <Link
                                to="/budgets"
                                className="text-xs md:text-sm font-semibold text-emerald-50/90 underline underline-offset-4 decoration-emerald-100/60 hover:decoration-emerald-50 hover:text-white"
                            >
                                Jag hoppar guiden – visa min budget direkt
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-4">
                    <PlayfulBirdCard
                        title="Steg 1 – bestäm dina mål"
                        description="Bestäm vad som är viktigast: betala av skulder, spara till en buffert eller något roligt."
                        ctaLabel="Gå till mål"
                        to="/goals"
                        imageSrc={GoalBird}
                    />
                    <PlayfulBirdCard
                        title="Steg 2 – kartlägg dina pengar"
                        description="Lägg till din inkomst och fasta utgifter så eBudget kan räkna ut ditt verkliga andrum."
                        ctaLabel="Spåra utgifter"
                        to="/expenses"
                        imageSrc={CalcBird}
                    />
                    <PlayfulBirdCard
                        title="Steg 3 – säkra din buffert"
                        description="Sätt upp din buffert så oväntade räkningar inte förstör din månad."
                        ctaLabel="Buffert"
                        to="/emergency-fund"
                        imageSrc={RichBird}
                    />
                </div>
            </div>
        </div>
    );
};

export default FirstTimeDashboardSection;
