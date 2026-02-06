import React from "react";
import clsx from "clsx";
import WizardStatTile, { type WizardTone } from "./WizardStatTile";

type Props = {
    label: string;
    value: React.ReactNode;
    tone?: WizardTone;
    cta?: { label: string; onClick: () => void };
};

export default function WizardStatTileWithCta({
    label,
    value,
    tone = "neutral",
    cta,
}: Props) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="text-xs text-wizard-text/50">{label}</div>

            <div
                className={clsx(
                    "mt-1 text-sm font-semibold",
                    tone === "neutral" && "text-wizard-text/85",
                    tone === "muted" && "text-wizard-text/55",
                    tone === "warn" && "text-wizard-warning"
                )}
            >
                {value}
            </div>

            {cta && (
                <button
                    type="button"
                    onClick={cta.onClick}
                    className="
    mt-2 inline-flex items-center justify-center
    rounded-xl px-3 py-2 text-xs font-semibold
    bg-wizard-surface border border-wizard-stroke/20
    text-wizard-text shadow-sm shadow-black/5
    transition-colors
    hover:bg-wizard-stroke/10 hover:border-wizard-stroke/35
    focus:outline-none focus-visible:ring-2 focus-visible:ring-wizard-stroke/45
    active:scale-[0.99]
  "
                >
                    {cta.label}
                </button>
            )}
        </div>
    );
}
