import * as React from "react";
import { Link, type LinkProps } from "react-router-dom";
import { cn } from "@/lib/utils";
import { actionClass } from "./actions";

export type ActionVariant = "primary" | "secondary" | "ghost";
export type ActionSize = "md" | "sm" | "xs";

export type ActionLinkProps = Omit<LinkProps, "className"> & {
  variant?: ActionVariant;
  size?: ActionSize;
  className?: string;
};

export const ActionLink = React.forwardRef<HTMLAnchorElement, ActionLinkProps>(
  ({ variant = "secondary", size = "md", className, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        className={cn(actionClass({ variant, size }), className)}
        {...props}
      />
    );
  }
);

ActionLink.displayName = "ActionLink";
