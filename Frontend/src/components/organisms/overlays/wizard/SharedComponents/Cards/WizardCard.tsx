import React from "react";
import { cn } from "@/lib/utils";

type Props = {
    children: React.ReactNode;
    className?: string;

    title?: React.ReactNode;
    subtitle?: React.ReactNode;

    /** Optional small right-side element in header (badge, total, etc.) */
    headerRight?: React.ReactNode;

    /** If you want tighter/looser padding */
    padding?: "sm" | "md" | "lg";
};

const PAD: Record<NonNullable<Props["padding"]>, string> = {
    sm: "p-4",
    md: "p-5 md:p-6",
    lg: "p-6 md:p-7",
};

export const WizardCard: React.FC<Props> = ({
    children,
    className,
    title,
    subtitle,
    headerRight,
    padding = "md",
}) => {
    return (
        <div
            className={cn(
                "rounded-2xl border border-white/12 bg-wizard-shell/80 shadow-lg shadow-black/10",
                "backdrop-blur-sm",
                PAD[padding],
                className
            )}
        >
            {(title || subtitle || headerRight) ? (
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        {title ? (
                            <div className="text-base font-semibold text-white/90">{title}</div>
                        ) : null}
                        {subtitle ? (
                            <div className="mt-1 text-sm text-white/60">{subtitle}</div>
                        ) : null}
                    </div>

                    {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
                </div>
            ) : null}

            {children}
        </div>
    );
};

export default WizardCard;
