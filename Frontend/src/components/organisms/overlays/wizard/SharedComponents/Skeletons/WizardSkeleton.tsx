import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

type Variant = "intro" | "form" | "confirm";

type Props = {
    className?: string;
    variant?: Variant;          // defaults to "form"
    rows?: number;              // number of “field rows/cards” in the body
    withFooter?: boolean;       // show totals/footer blocks
    withProgress?: boolean;     // show progress bar placeholder
    withinCard?: boolean;       // wrap in wizard “glass” shell
};

export default function WizardSkeleton({
    className,
    variant = "form",
    rows,
    withFooter = true,
    withProgress = true,
    withinCard = false,
}: Props) {
    const bodyRows =
        rows ??
        (variant === "intro" ? 2 : variant === "confirm" ? 3 : 4);

    const content = (
        <div
            className={cn("p-4 sm:p-6 space-y-6", className)}
            aria-busy="true"
            aria-live="polite"
        >
            {/* Progress */}
            {withProgress && (
                <div className="w-full overflow-x-auto scrollbar-none">
                    <div className="min-w-max flex items-center justify-center gap-3 px-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-10 w-10 rounded-full" />
                        ))}
                    </div>
                </div>
            )}

            {/* Step pill + header */}
            <div className="space-y-3">
                <div className="flex justify-center">
                    <Skeleton className="h-6 w-44 rounded-full" />
                </div>

                <Skeleton className="h-10 w-[min(560px,100%)] rounded-2xl" />
                <Skeleton className="h-4 w-[min(720px,100%)] rounded-xl" />
                <Skeleton className="h-4 w-[min(560px,85%)] rounded-xl" />
            </div>

            {/* Main body */}
            <div className="space-y-3">
                {variant === "confirm" ? (
                    <>
                        <Skeleton className="h-40 w-full rounded-2xl" /> {/* totals/coach */}
                        <Skeleton className="h-24 w-full rounded-2xl" /> {/* accordion header */}
                        {Array.from({ length: Math.max(0, bodyRows - 2) }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                        ))}
                    </>
                ) : (
                    Array.from({ length: bodyRows }).map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                    ))
                )}
            </div>

            {/* Footer */}
            {withFooter && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                    <Skeleton className="h-6 w-[min(420px,80%)] mx-auto rounded-xl" />
                    <Skeleton className="h-6 w-[min(460px,85%)] mx-auto rounded-xl" />
                    <Skeleton className="h-7 w-[min(520px,90%)] mx-auto rounded-xl" />
                </div>
            )}
        </div>
    );

    if (!withinCard) return content;

    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
            {content}
        </div>
    );
}
