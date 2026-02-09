import * as React from "react";
import { cn } from "@/lib/utils";
import { secondaryActionClass } from "./ctaStyles";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string };

export const SecondaryButton = React.forwardRef<HTMLButtonElement, Props>(
    ({ className, type = "button", ...props }, ref) => (
        <button
            ref={ref}
            type={type}
            className={cn(secondaryActionClass, className)}
            {...props}
        />
    )
);

SecondaryButton.displayName = "SecondaryButton";
