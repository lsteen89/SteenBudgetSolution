import React from "react";

export type MiniGradientBarTone = "income" | "expense" | "savings" | "danger" | "neutral";

type Props = {
    pct: number; // 0..1
    tone?: MiniGradientBarTone;
    minWidthPct?: number; // default 4
    heightClassName?: string; // default "h-1.5"
    className?: string;
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function toneClass(tone: MiniGradientBarTone) {
    switch (tone) {
        case "income":
            // your palette
            return "bg-gradient-to-r from-limeGreen/80 to-darkLimeGreen/80";
        case "expense":
            // neutral “cost” palette
            return "bg-gradient-to-r from-slate-400/70 to-sky-400/70";
        case "savings":
            // progress / goals palette
            return "bg-gradient-to-r from-sky-400/70 to-teal-400/70";
        case "danger":
            // debt / warning palette
            return "bg-gradient-to-r from-rose-400/75 to-orange-400/75";
        default:
            return "bg-gradient-to-r from-indigo-400/70 to-sky-400/70";
    }
}

export default function MiniGradientBar({
    pct,
    tone = "neutral",
    minWidthPct = 4,
    heightClassName = "h-1.5",
    className,
}: Props) {
    const width = Math.max(minWidthPct, Math.min(100, Math.round(clamp01(pct) * 100)));

    return (
        <div className={`mt-2 ${heightClassName} w-full rounded-full bg-slate-200/70 overflow-hidden ${className ?? ""}`}>
            <div
                className={`h-full rounded-full ${toneClass(tone)} transition group-hover/row:brightness-110`}
                style={{ width: `${width}%` }}
            />
        </div>
    );
}
