import React from 'react';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Rewind, FastForward } from 'lucide-react';
import GhostIconButton from '@components/atoms/buttons/GhostIconButton';

export interface WizardNavPairProps {
  step: number;
  prevStep(): void;
  nextStep(): void;
  hasPrev: boolean;
  hasNext: boolean;
  
  // The component now needs to know the sub-step status specifically.
  hasPrevSub: boolean;
  hasNextSub: boolean;

  // ... other props are the same
  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
  isSaving: boolean;
  isActionBlocked: boolean; 
}

const WizardNavPair: React.FC<WizardNavPairProps> = ({
  step,
  prevStep,
  nextStep,
  hasPrev,
  hasNext,
  // De-structure the new props
  hasPrevSub,
  hasNextSub,
  connectionError,
  initLoading,
  transitionLoading,
  isDebugMode,
  showShakeAnimation,
  isSaving,
  isActionBlocked,
}) => {
  const isLocked =
    isSaving ||
    (!isDebugMode && (
      initLoading ||
      transitionLoading ||
      (connectionError && step === 0)
    ));

    const disablePrev = isLocked || !hasPrev || isActionBlocked;
    const disableNext = isLocked || !hasNext || isActionBlocked;

  const isPrevMajor = !hasPrevSub; 
  const isNextMajor = !hasNextSub; 

  const IconPrev = isPrevMajor ? Rewind : ChevronLeft;
  const IconNext = isNextMajor ? FastForward : ChevronRight;

  const labelPrev = isPrevMajor
    ? 'Föregående huvudsteg'
    : 'Föregående delsteg';

  const labelNext = isNextMajor
    ? 'Nästa huvudsteg'
    : 'Nästa delsteg';

  // ... the rest of the component is mostly the same ...
  const btnClass = (disabled: boolean) => clsx(disabled && 'opacity-50 cursor-not-allowed');
  const sizeClass = 'w-12 h-12 md:w-14 md:h-14';
  const hoverClass = !showShakeAnimation && 'hover:bg-customBlue2 hover:scale-105 transition-transform duration-150';
  
  return (
    <>
      <GhostIconButton
        onClick={prevStep}
        disabled={disablePrev}
        aria-label={labelPrev}
        shake={false}
        className={clsx(btnClass(disablePrev), sizeClass, hoverClass)}
      >
        <IconPrev size={24} className="text-darkLimeGreen" />
      </GhostIconButton>

      <GhostIconButton
        onClick={nextStep}
        disabled={disableNext}
        aria-label={labelNext}
        shake={showShakeAnimation}
        className={clsx(btnClass(disableNext), sizeClass, hoverClass)}
      >
        <IconNext size={24} className="text-darkLimeGreen" />
      </GhostIconButton>
    </>
  );
};

export default WizardNavPair;