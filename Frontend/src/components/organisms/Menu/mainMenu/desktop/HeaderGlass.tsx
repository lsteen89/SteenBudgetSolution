import React from "react";
import { cn } from "@/lib/utils";

type Props = { children: React.ReactNode; className?: string };

export function HeaderGlass({ children, className }: Props) {
    return (
        <header className="sticky top-0 z-50">
            <div className={cn("relative", className)}>{children}</div>
        </header>
    );
}
