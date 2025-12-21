import React from "react";
import { cn } from "@/utils/cn";

type Props = {
    title: string;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    actions?: React.ReactNode;
};

const CardShell: React.FC<Props> = ({ title, subtitle, children, className, actions }) => {
    return (
        <section className={cn("rounded-3xl bg-white/80 border border-slate-100 shadow-sm px-5 py-4", className)}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
                    {subtitle ? <div className="mt-1 text-xs text-slate-500">{subtitle}</div> : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>

            <div className="mt-3">{children}</div>
        </section>
    );
};

export default CardShell;
