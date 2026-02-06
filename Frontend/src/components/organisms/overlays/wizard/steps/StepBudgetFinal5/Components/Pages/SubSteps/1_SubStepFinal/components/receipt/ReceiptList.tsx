import React from "react";

export type ReceiptRow = {
    left: string;
    right: string;
    sub?: string;      // e.g. "41%"
    rightSub?: string; // optional extra on right
};

export default function ReceiptList({
    title,
    unit = "kr/mån",
    rows,
    footer,
}: {
    title: string;
    unit?: string;
    rows: ReceiptRow[];
    footer?: React.ReactNode;
}) {
    return (
        <div
            className="
      rounded-3xl
      bg-wizard-shell/75
      ring-1 ring-white/50
      border border-wizard-stroke/20
      shadow-[0_10px_30px_rgba(2,6,23,0.08)]
      p-4 sm:p-5
    "
        >
            {/* header */}
            <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-semibold text-wizard-text/90 truncate">
                    {title}
                </h4>
                <span className="shrink-0 text-[11px] font-semibold text-wizard-text/55">
                    {unit}
                </span>
            </div>

            {/* rows */}
            <ul className="mt-3 divide-y divide-wizard-stroke/20">
                {rows.map((r, i) => (
                    <li key={`${r.left}-${i}`} className="py-2.5">
                        <div className="grid grid-cols-[1fr_auto] gap-x-4 items-start">
                            {/* LEFT */}
                            <div className="min-w-0">
                                <div className="text-sm text-wizard-text/85 truncate">
                                    {r.left}
                                </div>
                                {r.sub ? (
                                    <div className="mt-0.5 text-xs text-wizard-text/60">
                                        {r.sub}
                                    </div>
                                ) : null}
                            </div>

                            {/* RIGHT */}
                            <div className="text-right">
                                <div className="text-sm font-mono font-semibold tabular-nums text-wizard-text whitespace-nowrap">
                                    {r.right}
                                </div>
                                {r.rightSub ? (
                                    <div className="mt-0.5 text-xs text-wizard-text/60 whitespace-nowrap">
                                        {r.rightSub}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>

            {/* footer */}
            {footer ? (
                <div className="pt-3 mt-3 border-t border-wizard-stroke/20">
                    {footer}
                </div>
            ) : null}
        </div>
    );
}   