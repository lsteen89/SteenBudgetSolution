import * as React from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg" | "xl" | "2xl" | "full";

const sizeMap: Record<Size, string> = {
    sm: "max-w-xl",
    md: "max-w-3xl",
    lg: "max-w-4xl",
    xl: "max-w-6xl",
    "2xl": "max-w-7xl",
    full: "max-w-none",
};

type Props = {
    children: React.ReactNode;
    className?: string;

    /** Container width */
    size?: Size;

    /** Horizontal padding (usually keep true) */
    paddedX?: boolean;

    /** Vertical spacing between direct children */
    stack?: boolean;
    stackGap?: "sm" | "md" | "lg";

    /** Centers the wrapper itself inside parent (default true) */
    centered?: boolean;

    /** Change element if needed (rare) */
    as?: "section" | "div" | "main" | "article";
};

const stackGapMap: Record<NonNullable<Props["stackGap"]>, string> = {
    sm: "gap-3",
    md: "gap-4",
    lg: "gap-6",
};

export default function ContentWrapperV2({
    children,
    className,
    size = "lg",
    paddedX = true,
    centered = true,
    stack = false,
    stackGap = "md",
    as: Comp = "section",
}: Props) {
    return (
        <Comp
            className={cn(
                "w-full",
                centered && "mx-auto",
                sizeMap[size],
                paddedX && "px-4 sm:px-6 lg:px-8",
                stack && cn("flex flex-col", stackGapMap[stackGap]),
                className
            )}
        >
            {children}
        </Comp>
    );
}
