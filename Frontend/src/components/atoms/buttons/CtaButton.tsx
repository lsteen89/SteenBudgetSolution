import * as React from "react";
import { cn } from "@/lib/utils";
import { ctaBaseClass } from "./ctaStyles";

type CtaButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    className?: string;
};

export const CtaButton = React.forwardRef<HTMLButtonElement, CtaButtonProps>(
    ({ className, type = "button", ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(ctaBaseClass, className)}
            {...props}
        />
    )
);

CtaButton.displayName = "CtaButton";
