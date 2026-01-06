import React from "react";
import { cn } from "@/utils/cn";

type Props = {
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;

    stats?: React.ReactNode;   // small chips/metrics row under subtitle
    callout?: React.ReactNode; // highlighted block above content
    footer?: React.ReactNode;  // optional bottom row (e.g. "Remaining")
};

const CardShell: React.FC<Props> = ({
    title,
    subtitle,
    children,
    className,
    actions,
    stats,
    callout,
    footer,
}) => {
    return (
        <section
            className={cn(
                "group rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4",
                "transition hover:bg-white/90 hover:shadow-md hover:-translate-y-[1px]",
                className
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>

                    {subtitle ? (
                        <div className="mt-1 text-xs text-slate-500">{subtitle}</div>
                    ) : null}

                    {stats ? (
                        <div className="mt-2 flex flex-wrap gap-2">{stats}</div>
                    ) : null}
                </div>

                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>

            {callout ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white/60 px-3 py-2 text-xs text-slate-700">
                    {callout}
                </div>
            ) : null}

            <div className={cn("mt-3 tabular-nums", footer ? "pb-2" : null)}>{children}</div>

            {footer ? (
                <div className="mt-3 border-t border-slate-100 pt-3 text-xs">{footer}</div>
            ) : null}
        </section>
    );
};

export default CardShell;
