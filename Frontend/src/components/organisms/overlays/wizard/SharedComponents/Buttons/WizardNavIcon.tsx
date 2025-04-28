// src/components/atoms/buttons/WizardNavIcon.tsx
/**
 * WizardNavIcon – 1× circular icon button selected via `variant`.
 * Used by WizardNavPair & WizardNavigationFooter.
 */
import React from "react";
import clsx from "clsx";
import GhostIconButton, { GhostIconButtonProps } from "@components/atoms/buttons/GhostIconButton";
import { ChevronLeft, ChevronRight, Rewind, FastForward } from "lucide-react";

export type NavIconVariant = "prevMajor" | "prevSub" | "nextSub" | "nextMajor";

const cfg: Record<NavIconVariant, { icon: JSX.Element; label: string }> = {
  prevMajor: { icon: <Rewind size={24} className="text-darkLimeGreen" />, label: "Föregående huvudsteg" },
  prevSub:   { icon: <ChevronLeft size={24} className="text-darkLimeGreen" />, label: "Föregående delsteg" },
  nextSub:   { icon: <ChevronRight size={24} className="text-darkLimeGreen" />, label: "Nästa delsteg" },
  nextMajor: { icon: <FastForward size={24} className="text-darkLimeGreen" />, label: "Nästa huvudsteg" },
};

export interface WizardNavIconProps extends GhostIconButtonProps {
  variant: NavIconVariant;
  showShake?: boolean;
}

const WizardNavIcon = React.forwardRef<HTMLButtonElement, WizardNavIconProps>(
  ({ variant, showShake = false, className, ...rest }, ref) => {
    const { icon, label } = cfg[variant];
    return (
      <GhostIconButton
        ref={ref}
        aria-label={label}
        className={clsx(showShake && "motion-safe:animate-shake", className)}
        {...rest}
      >
        {icon}
      </GhostIconButton>
    );
  }
);

WizardNavIcon.displayName = "WizardNavIcon";
export default WizardNavIcon;
