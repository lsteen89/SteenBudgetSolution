import React from "react";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import WizardCard from "@/components/organisms/overlays/wizard/SharedComponents/Cards/WizardCard";

export default function DebtMinimumRealityCard({
  monthly,
  money0,
}: {
  monthly: number;
  money0: (v: number) => string;
}) {
  const hasValue = Number.isFinite(monthly) && monthly > 0;

  return (
    <WizardCard>


      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-wizard-accent" />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-wizard-text/55">
              Minimibetalningar
            </p>
          </div>

          <span className="text-xs text-wizard-text/45">Baslinje</span>
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="text-sm text-wizard-text/70">Totalt minimum</p>

          <p className="font-mono text-2xl font-extrabold tabular-nums">
            <span className={cn("money", hasValue ? "text-wizard-accent" : "text-wizard-text/60")}>
              {hasValue ? money0(monthly) : "—"}
            </span>
            <span className="ml-2 text-sm font-semibold text-wizard-text/55">/mån</span>
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              "bg-wizard-surface-accent/50 border border-wizard-stroke/20",
              "text-wizard-text/70"
            )}
          >
            Minimum = alltid
          </span>

          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              "bg-wizard-surface-accent/50 border border-wizard-stroke/20",
              "text-wizard-text/70"
            )}
          >
            Extra = valfritt
          </span>
        </div>

        <p className="mt-3 text-xs text-wizard-text/55">
          Detta är din lägsta nivå. Extra betalningar kan minska skuldtiden rejält.
        </p>
      </div>
    </WizardCard>
  );
}
