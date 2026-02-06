import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  Home, FileText, Utensils, Car, Shirt, CreditCard,
  ArrowRight, Lock, CheckCircle2, ChevronRight
} from "lucide-react";

import { cn } from "@/lib/utils";
import { WizardStepPill } from "@/components/organisms/overlays/wizard/SharedComponents/Headers/WizardStepPill";
import { WizardMascot } from "@/components/atoms/animation/WizardMascot";

import bird from "@/assets/Images/GuideBird.png";

export type ItemKey =
  | "boende"
  | "fasta"
  | "mat"
  | "transport"
  | "klader"
  | "prenumerationer";

type Item = {
  key: ItemKey;
  Icon: LucideIcon;
  title: string;
  desc: string;
};

const ITEMS: Item[] = [
  { key: "boende", Icon: Home, title: "Boende", desc: "Hyra, bolån och andra boendekostnader." },
  { key: "fasta", Icon: FileText, title: "Fasta utgifter", desc: "El, vatten, internet och försäkringar." },
  { key: "mat", Icon: Utensils, title: "Mat", desc: "Matbutik, hämtmat och restaurangbesök." },
  { key: "transport", Icon: Car, title: "Transport", desc: "Bil eller kollektivtrafik." },
  { key: "klader", Icon: Shirt, title: "Kläder", desc: "Uppskattad månadskostnad." },
  { key: "prenumerationer", Icon: CreditCard, title: "Prenumerationer", desc: "Streaming och andra tjänster." },
];

type Props = {
  onStart: () => void;
  onPick?: (key: ItemKey) => void;
  canPick?: (key: ItemKey) => boolean;
};

const ExpenditureOverviewMainText: React.FC<Props> = ({ onStart, onPick, canPick }) => {

  return (
    <div className="relative">
      <div className={cn("mb-4", "flex justify-center")}>
        <WizardStepPill stepNumber={2} majorLabel="Utgifter" subLabel="Intro" />
      </div>

      <h3 className="text-center text-3xl font-extrabold tracking-tight text-wizard-text">
        Ta kontroll över dina utgifter
      </h3>

      <p className="mt-3 text-center text-base text-wizard-text/70">
        Du kan alltid gå tillbaka. Vi håller ordning åt dig.
      </p>

      {/* Cards (more compact on mobile) */}
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        {ITEMS.map(({ key, Icon, title, desc }) => {
          const allowed = canPick ? canPick(key) : false;
          const clickable = !!onPick && allowed;

          return (
            <button
              key={key}
              type="button"
              onClick={() => clickable && onPick?.(key)}
              disabled={!clickable}
              className={cn(
                "group text-left rounded-2xl p-4 w-full",
                "border shadow-sm shadow-black/5 transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/30",
                "active:scale-[0.99]",
                clickable
                  ? [
                    "bg-white/10 border-white/15",
                    "hover:bg-white/14 hover:border-white/25",
                    "hover:shadow-[0_10px_25px_rgba(2,6,23,0.08)]",
                    "hover:-translate-y-[1px]",
                    "cursor-pointer",
                  ].join(" ")
                  : "bg-white/[0.07] border-white/10 opacity-60 cursor-not-allowed"
              )}
              aria-disabled={!clickable}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-xl border shrink-0",
                    clickable ? "bg-white/18 border-white/15" : "bg-white/10 border-white/10"
                  )}
                >
                  <Icon className="h-5 w-5 text-wizard-text/75" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-wizard-text truncate">{title}</p>

                    {clickable ? (
                      <span className="inline-flex items-center gap-2 text-xs font-semibold text-wizard-accent">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Klar</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/25 px-2 py-1 text-wizard-text/80">
                          Gå till <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-wizard-text/45">
                        <Lock className="h-3.5 w-3.5" /> Följ ordningen
                      </span>
                    )}
                  </div>

                  {/* MORE info on phone: keep desc visible */}
                  <p className="mt-1 text-sm text-wizard-text/65 leading-relaxed">
                    {desc}
                  </p>

                  {/* extra hint only on desktop hover */}
                  {clickable ? (
                    <p className="mt-2 hidden sm:block text-xs text-wizard-text/55 opacity-0 group-hover:opacity-100 transition">
                      Du kan hoppa tillbaka hit när som helst.
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA + Mascot together (more visible, less “random sticker”) */}
      <div className="mt-7 sm:mt-10 flex items-center justify-center gap-4 sm:gap-7">
        <div className="hidden sm:block pointer-events-none select-none">
          <WizardMascot
            src={bird}
            size={170}      // default desktop size
            className="lg:scale-110" // slightly bigger on large screens
            showText={false}
            hello
            float
            tilt
          />
        </div>

        <button
          type="button"
          onClick={onStart}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-5 py-3",
            "bg-wizard-accent text-white font-semibold",
            "shadow-sm shadow-black/10",
            "hover:brightness-[1.02] active:brightness-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wizard-accent/35"
          )}
        >
          Starta med Boende <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-6 pt-5 border-t border-white/15">
        <p className="text-center text-sm text-wizard-text/85">
          Tips: Du kan gå direkt till en kategori om du redan fyllt i den tidigare.
        </p>
      </div>
    </div>
  );
};

export default ExpenditureOverviewMainText;
