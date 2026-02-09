import * as React from "react";
import { actionClass } from "./actions";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "ghost";
    size?: "md" | "sm" | "xs";
    className?: string;
};

export const ActionButton = React.forwardRef<HTMLButtonElement, Props>(
    ({ variant, size, className, type = "button", ...props }, ref) => (
        <button ref={ref} type={type} className={actionClass({ variant, size, className })} {...props} />
    )
);
ActionButton.displayName = "ActionButton";
