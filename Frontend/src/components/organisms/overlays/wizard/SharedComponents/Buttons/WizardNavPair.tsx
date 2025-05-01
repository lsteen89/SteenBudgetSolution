/**
 * WizardNavPair – renders two buttons:
 *   • Major mode  : ⏪ ⏩
 *   • Sub-step mode: ‹ › (or “Start” › on first sub-step)
 * Desktop / tablet use one major pair + one sub pair in different places.
 */
import React from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, Rewind, FastForward } from "lucide-react";
import GhostIconButton from "@components/atoms/buttons/GhostIconButton";

export interface WizardNavPairProps {
  step: number;
  prevStep(): void;
  nextStep(): void;
  hasPrev: boolean;   
  hasNext: boolean;
  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
  /** true = ⏪⏩  |  false = ‹ › / “Start” › */
  isMajor: boolean;       
  isSaving: boolean;
}

const WizardNavPair: React.FC<WizardNavPairProps > = ({
  step,
  prevStep,
  nextStep,
  hasPrev,
  hasNext,
  connectionError,
  initLoading,
  transitionLoading,
  isDebugMode,
  showShakeAnimation,
  isMajor,
  isSaving,
}) => {
  
  /* locks all buttons during async work */
const isLocked =
  isSaving ||                             // always locked when saving
  (!isDebugMode && (                     // when *not* in debug…
    initLoading ||                       // …if still initializing
    transitionLoading ||                 // …or mid-transition
    (connectionError && step === 0)      // …or on step 0 with a connection error
  ));

  /* decide per-button */
  const disablePrev = isLocked || !hasPrev;
  const disableNext = isLocked || !hasNext;

  const btnClass = (disabled: boolean) =>
      clsx(
        disabled && "opacity-50 cursor-not-allowed"
      );
  const sizeClass = "w-12 h-12 md:w-14 md:h-14";          // or props.sizeClass

  const hoverClass =
  !showShakeAnimation && "hover:bg-customBlue2 hover:scale-105 transition-transform duration-150";

  //Lämnade här! När vi kollar connectionerror är det viktigt att vi också bara kollar i första steget, annars kommer inte användare komma vidare i guiden.
  const IconPrev = isMajor ? Rewind : ChevronLeft;
  const IconNext = isMajor ? FastForward : ChevronRight;

  const labelPrev = isMajor
    ? "Föregående huvudsteg"
    : "Föregående delsteg";

  /* sub-step pair shows “Starta” only on its first page (= no prev)  */
  const labelNext = isMajor
    ? "Nästa huvudsteg"
    : !hasPrev                     // first sub-step
    ? "Starta"
    : "Nästa delsteg";

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
