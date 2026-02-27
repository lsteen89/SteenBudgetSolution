import * as React from "react";
import { cn } from "@/lib/utils";

type Props = React.HTMLAttributes<HTMLSpanElement> & {
    as?: "span" | "div";
};

export function Pill({ as: Comp = "span", className, ...props }: Props) {
    return (
        <Comp
            className={cn(
                "inline-flex items-center h-9 px-3 rounded-full",
                "text-sm font-semibold",
                "bg-[rgb(var(--eb-shell)/0.35)] border border-eb-stroke/25",
                "text-eb-text/75",
                className
            )}
            {...props}
        />
    );
}
