import React from "react";
import CloudMenu from "@assets/Components/Menu/CloudMenu_1440.svg?react";
import { cn } from "@/lib/utils";

type Props = {
    /** Positioning + translate goes here (layout decides this) */
    className?: string;

    /** Usually w-[min(1100px,96vw)] or w-[min(1200px,100vw)] */
    widthClass?: string;

    /** Keep the soft wash behind content */
    wash?: boolean;
    washHeightClass?: string;
};

export default function CloudBackdrop({
    className,
    widthClass = "w-[min(1100px,96vw)]",
    wash = true,
    washHeightClass = "h-16",
}: Props) {
    return (
        <>
            <div
                className={cn(
                    "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2",
                    // fade the cloud out so it never fights nav/buttons
                    "[mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_80%)]",
                    "[-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_45%,transparent_80%)]",
                    className
                )}
                aria-hidden="true"
            >
                <div className={cn("relative", widthClass)}>
                    {/* Stroke */}
                    <CloudMenu
                        className="absolute inset-0 w-full h-auto
                       text-[rgb(var(--eb-stroke)/0.75)]
                       scale-[1.01]
                       drop-shadow-[0_18px_36px_rgba(21,39,81,0.10)]"
                    />
                    {/* Fill */}
                    <CloudMenu
                        className="relative w-full h-auto
                       text-[rgb(255_255_255/0.78)]
                       drop-shadow-[0_18px_36px_rgba(21,39,81,0.10)]"
                    />
                </div>
            </div>

            {wash && (
                <div
                    className={cn(
                        "pointer-events-none absolute inset-x-0 top-0",
                        washHeightClass,
                        "bg-gradient-to-b from-[rgb(var(--eb-shell)/0.18)] to-transparent"
                    )}
                    aria-hidden="true"
                />
            )}
        </>
    );
}
