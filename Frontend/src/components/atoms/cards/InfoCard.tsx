import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement> & {
    icon?: React.ReactNode;
    title: React.ReactNode;
    text?: React.ReactNode;
};

export function InfoCard({ icon, title, text, className, ...props }: Props) {
    return (
        <div
            className={cn(
                "rounded-2xl p-5",
                "bg-eb-surface/85 backdrop-blur",
                "border border-eb-stroke/25",
                "shadow-[0_12px_32px_rgba(21,39,81,0.08)]",
                className
            )}
            {...props}
        >
            <div className="flex items-start gap-3">
                {icon ? <div className="mt-0.5">{icon}</div> : null}

                <div className="min-w-0">
                    <div className="text-sm font-bold text-eb-text">{title}</div>
                    {text ? (
                        <div className="mt-1 text-sm text-eb-text/65 leading-relaxed">{text}</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
