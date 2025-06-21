/**
 * WizardNavigationFooter – mobile-only row with TWO smart buttons.
 * It combines major and sub-step navigation into a unified experience.
 * Use in a fixed <footer> on screens < md.
 */
import React from 'react';
import clsx from 'clsx';
import NavigationButton from '@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavIcon';

// Interface remains the same, we're just using the props differently
export interface WizardNavigationFooterProps {
  prevMajor(): void;
  nextMajor(): void;
  hasPrevMajor: boolean;
  hasNextMajor: boolean;
  prevSub(): void;
  nextSub(): void;
  hasPrevSub: boolean;
  hasNextSub: boolean;
  isSaving: boolean;
  step: number;
  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
}

const WizardNavigationFooter: React.FC<WizardNavigationFooterProps> = ({
  prevMajor, nextMajor, prevSub, nextSub,
  hasPrevMajor, hasNextMajor, hasPrevSub, hasNextSub,
  step, connectionError, initLoading, transitionLoading, isDebugMode, showShakeAnimation, isSaving,
}) => {
  /* Lock the whole bar when requests / transitions are running */
  const isLocked =
    isSaving ||
    (!isDebugMode && (
      initLoading ||
      transitionLoading ||
      (connectionError && step === 0)
    ));

  // Determine the correct "Back" action and availability
  const goBack = hasPrevSub ? prevSub : prevMajor;
  const canGoBack = hasPrevSub || hasPrevMajor;
  const disablePrev = isLocked || !canGoBack;

  // Determine the correct "Next" action and availability
  const goNext = hasNextSub ? nextSub : nextMajor;
  const canGoNext = hasNextSub || hasNextMajor;
  const disableNext = isLocked || !canGoNext;

  // Determine which icons to use
  const prevIcon = hasPrevSub ? 'prevSub' : 'prevMajor';
  const nextIcon = hasNextSub ? 'nextSub' : 'nextMajor';

  const btnCls = (disabled: boolean) =>
    clsx(disabled && 'opacity-50 cursor-not-allowed', showShakeAnimation && 'motion-safe:animate-shake');

  return (
    <div className="flex items-center justify-between w-full px-4">
      {/* 1 — The One "Back" Button */}
      <NavigationButton
        variant={prevIcon}
        onClick={goBack}
        disabled={disablePrev}
        className={clsx(btnCls(disablePrev), 'w-14 h-14')}
      />

      {/* 2 — The One "Next" Button */}
      <NavigationButton
        variant={nextIcon}
        onClick={goNext}
        disabled={disableNext}
        className={clsx(btnCls(disableNext), 'w-14 h-14')}
      />
    </div>
  );
};

export default WizardNavigationFooter;