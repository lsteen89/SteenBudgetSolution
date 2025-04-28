import React from "react";
import clsx from "clsx";
import styles from "./GhostIconButton.module.css";

/**
 * Props for a colour-themed, circular icon-only button.
 * – Forwards every standard <button> prop (onClick, disabled, type, …)
 * – Accepts an optional `className` so parents can merge extra utilities
 * - Accepts an optional `shake` flag to trigger shake animations.
 */
export interface GhostIconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  shake?: boolean;
}

/**
 * GhostIconButton – the visual foundation for every wizard-navigation icon.
 * No logic beyond styling; use NavigationButton to add variants / labels.
 */
const GhostIconButton = React.forwardRef<
  HTMLButtonElement,
  GhostIconButtonProps
  >(({ className = "", children, disabled, shake, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      {...rest}
      className={clsx(
        /* flex-centred layout */
        "inline-flex items-center justify-center",
        /* sizing can be overridden by parent (w-12 h-12 …) */
        "w-10 h-10",              // 40 × 40 px default
        "rounded-full p-0 transition",
        /* colour system */
        "bg-pastelGreen focus-visible:ring-2 focus-visible:ring-customBlue1",
        shake && styles.animateShake,
        className
      )}
    >
    {children}
  </button>
));

GhostIconButton.displayName = "GhostIconButton";

export default GhostIconButton;
