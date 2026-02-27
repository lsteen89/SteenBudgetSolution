import React from "react";
import CloudMenu from "@assets/Components/Menu/CloudMenu_1440.svg?react";
import { cn } from "@/lib/utils";

type Props = {
    className?: string;
    widthClass?: string; // e.g. w-[min(1100px,96vw)]
};

export default function CloudTrim({
    className,
    widthClass = "w-[min(1100px,96vw)]",
}: Props) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                "pointer-events-none absolute left-1/2 top-0 -translate-x-1/2",
                // clip it so it reads as “trim”, not “menu”
                "h-12 overflow-hidden opacity-70",

                // never fight content
                "[mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_95%)]",
                "[-webkit-mask-image:linear-gradient(to_bottom,black_0%,black_55%,transparent_95%)]",
                className
            )}
        >
            <div className={cn("relative", widthClass)}>
                {/* Stroke */}
                <CloudMenu
                    className="absolute inset-0 w-full h-auto
                     text-[rgb(var(--eb-stroke)/0.60)]
                     drop-shadow-[0_14px_30px_rgba(21,39,81,0.10)]"
                />
                {/* Fill */}
                <CloudMenu
                    className="relative w-full h-auto
                     text-[rgb(255_255_255/0.60)]
                     drop-shadow-[0_14px_30px_rgba(21,39,81,0.10)]"
                />
            </div>
        </div>
    );
}
