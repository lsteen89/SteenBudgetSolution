import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ctaBaseClass } from "./ctaStyles";

type CtaLinkProps = LinkProps & {
    className?: string;
};

export const CtaLink = React.forwardRef<HTMLAnchorElement, CtaLinkProps>(
    ({ className, ...props }, ref) => (
        <Link ref={ref} className={cn(ctaBaseClass, className)} {...props} />
    )
);

CtaLink.displayName = "CtaLink";
