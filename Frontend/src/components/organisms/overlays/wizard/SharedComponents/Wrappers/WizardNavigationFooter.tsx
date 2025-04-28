/**
 * WizardNavigationFooter – mobile-only row with four buttons
 * ordered ⏪ ‹ › ⏩ (prevMajor, prevSub, nextSub, nextMajor).
 * Use in a fixed <footer> on screens < md.
 */
import React from "react";
import clsx from "clsx";
import { WizardNavPairProps } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair"; 
import NavigationButton, { WizardNavIconProps } from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavIcon";

export interface WizardNavigationFooterProps {
  /* major-step handlers */
  prevMajor(): void;
  nextMajor(): void;
  hasPrevMajor: boolean;
  hasNextMajor: boolean;

  /* sub-step handlers (optional if step has no sub-pages) */
  prevSub(): void;
  nextSub(): void;
  hasPrevSub: boolean;
  hasNextSub: boolean;
  isSaving: boolean;

  /* shared flags */
  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
}

const WizardNavigationFooter: React.FC<WizardNavigationFooterProps> = ({
  // handlers
  prevMajor, nextMajor, prevSub, nextSub,
  // availability flags
  hasPrevMajor, hasNextMajor, hasPrevSub, hasNextSub,
  // shared flags
  connectionError, initLoading, transitionLoading, isDebugMode, showShakeAnimation, isSaving,
}) => {
  // We hide sub-nav buttons if there are no sub-steps available.
  const showSubNav = hasPrevSub || hasNextSub;
  /* Lock the whole bar when requests / transitions are running */
  const isLocked = isSaving ||
  (!isDebugMode && (connectionError || initLoading || transitionLoading));

  /* One boolean per button */
  const disablePrevMajor = isLocked || !hasPrevMajor;
  const disablePrevSub   = isLocked || !hasPrevSub;
  const disableNextSub   = isLocked || !hasNextSub;
  const disableNextMajor = isLocked || !hasNextMajor;

  const isDisabled = isDebugMode && (connectionError || initLoading || transitionLoading);
  const btnCls = (disabled: boolean) =>
    clsx(disabled && "opacity-50 cursor-not-allowed", showShakeAnimation && "motion-safe:animate-shake");

  return (
    <div className="flex items-center justify-between w-full">
      {/* 1 — Prev major (left) */}
      <NavigationButton
        variant="prevMajor"
        onClick={prevMajor}
        disabled={disablePrevMajor}
        className={clsx(btnCls(disablePrevMajor), "w-12 h-12 md:w-14 md:h-14")}
      />

      {showSubNav && (
        <div className="flex items-center space-x-16">
          {/* 2 — Prev sub */}
          <NavigationButton
            variant="prevSub"
            onClick={prevSub}
            disabled={disablePrevSub}
            className={clsx(btnCls(disablePrevSub), "w-12 h-12 md:w-14 md:h-14")}
          />

          {/* 3 — Next sub */}
          <NavigationButton
            variant="nextSub"
            onClick={nextSub}
            disabled={disableNextSub}
            className={clsx(btnCls(disableNextSub), "w-12 h-12 md:w-14 md:h-14")}
          />
        </div>
      )}

      {/* 4 — Next major (right) */}
      <NavigationButton
        variant="nextMajor"
        onClick={nextMajor}
        disabled={disableNextMajor}
        className={clsx(btnCls(disableNextMajor), "w-12 h-12 md:w-14 md:h-14")}
      />
    </div>
  );
};

export default WizardNavigationFooter;
