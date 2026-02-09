import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";
import { secondaryActionClass } from "./ctaStyles";

type Props = LinkProps & { className?: string };

export const SecondaryLink = React.forwardRef<HTMLAnchorElement, Props>(
    ({ className, ...props }, ref) => (
        <Link ref={ref} className={cn(secondaryActionClass, className)} {...props} />
    )
);

SecondaryLink.displayName = "SecondaryLink";
