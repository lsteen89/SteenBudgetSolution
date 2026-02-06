import React from "react";
import { cn } from "@/lib/utils";

type Props = {
    className?: string;
    children: React.ReactNode;
};

export default function WizardOverlayShell({ className, children }: Props) {
    return (
        <div className={cn("relative isolate rounded-2xl min-h-[520px]", className)}>
            <div className="absolute inset-0 overflow-hidden rounded-2xl" />
            <div className="relative z-10 overflow-visible h-full">{children}</div>
        </div>
    );
}
