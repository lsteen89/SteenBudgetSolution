import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLDivElement> & {
    tone?: "surface" | "shell";
    blur?: boolean;
};

export function SurfaceCard({
    tone = "surface",
    blur = true,
    className,
    ...props
}: Props) {
    const toneClass =
        tone === "surface"
            ? "bg-eb-surface/85 border border-eb-stroke/30"
            : "bg-eb-shell/55 border border-eb-stroke/30";

    return (
        <div
            className={cn(
                "rounded-3xl",
                blur && "backdrop-blur",
                toneClass,
                "shadow-[0_18px_55px_rgba(21,39,81,0.10)]",
                className
            )}
            {...props}
        />
    );
}
