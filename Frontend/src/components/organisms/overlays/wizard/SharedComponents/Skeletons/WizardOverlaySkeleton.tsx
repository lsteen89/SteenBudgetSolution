import React from "react";
import { cn } from "@/lib/utils";
import WizardSkeleton from "@/components/organisms/overlays/wizard/SharedComponents/Skeletons/WizardSkeleton";

export function WizardOverlaySkeleton({
    open,
    className,
    variant = "form",
    rows = 3,
}: {
    open: boolean;
    className?: string;
    variant?: "intro" | "form" | "confirm";
    rows?: number;
}) {
    return (
        <div
            aria-hidden={!open}
            className={cn(
                "absolute inset-0 z-50 rounded-2xl",
                "bg-black/25 backdrop-blur-[2px]",
                "flex items-center justify-center",
                "transition-opacity duration-150",
                open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
                className
            )}
        >
            <div className="w-[min(720px,95%)]">
                <WizardSkeleton
                    variant={variant}
                    withProgress={false}
                    withFooter={false}
                    rows={rows}
                />
            </div>
        </div>
    );
}
