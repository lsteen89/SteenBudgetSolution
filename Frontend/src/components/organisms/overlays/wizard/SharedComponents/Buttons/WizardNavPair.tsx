import React from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
} from "lucide-react";
import GhostIconButton from "@components/atoms/buttons/GhostIconButton";
import { useWizardNavEvents } from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardNavEvents";

export interface WizardNavPairProps {
  step: number;
  prevStep(): void;
  nextStep(): void;
  hasPrev: boolean;
  hasNext: boolean;

  hasPrevSub: boolean;
  hasNextSub: boolean;

  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
  isSaving: boolean;
  isActionBlocked: boolean;

  /** If you mean "first screen", keep this true. Default: step === 0 */
  showStartOnFirstStep?: boolean;
  hideNext?: boolean;
}

const WizardNavPair: React.FC<WizardNavPairProps> = ({
  step,
  prevStep,
  nextStep,
  hasPrev,
  hasNext,
  hasPrevSub,
  hasNextSub,
  connectionError,
  initLoading,
  transitionLoading,
  isDebugMode,
  showShakeAnimation,
  isSaving,
  isActionBlocked,
  showStartOnFirstStep = true,
  hideNext = false
}) => {

  const nav = useWizardNavEvents();

  const isLocked =
    isSaving ||
    (!isDebugMode && (initLoading || transitionLoading || (connectionError && step === 0)));

  const disablePrev = isLocked || !hasPrev || isActionBlocked;
  const disableNext = isLocked || !hasNext || isActionBlocked;

  const isPrevMajor = !hasPrevSub;
  const isNextMajor = !hasNextSub;

  // Major = double chevrons, Sub = single chevron
  const IconPrev = isPrevMajor ? ChevronsLeft : ChevronLeft;
  const IconNext = isNextMajor ? ChevronsRight : ChevronRight;

  const labelPrev = isPrevMajor ? "Föregående huvudsteg" : "Föregående delsteg";
  const labelNext = isNextMajor ? "Nästa huvudsteg" : "Nästa delsteg";

  const handlePrevClick = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    prevStep();
  };

  const handleNextClick = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    nextStep();
  };

  const sizeClass = "w-12 h-12 md:w-14 md:h-14";
  const hoverClass =
    !showShakeAnimation && "hover:bg-customBlue2 hover:scale-105 transition-transform duration-150";
  const btnClass = (disabled: boolean) =>
    clsx(disabled && "opacity-50 cursor-not-allowed", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-darkLimeGreen/50");

  const iconClass = (disabled: boolean) =>
    clsx(disabled ? "text-darkLimeGreen/40" : "text-darkLimeGreen");

  // Your “Start” rule (I assume first step is step === 0)
  const isFirst = step === 0;
  const showStart = showStartOnFirstStep && isFirst && !hasPrev && hasNext;

  // If it’s the only control, center it (works if parent is flex)
  const startWrapperClass = "flex-1 flex justify-center";
  const fireNextHoverStart = () => {
    if (!disableNext) nav.emit("nextHoverStart");
  };
  const fireNextHoverEnd = () => nav.emit("nextHoverEnd");

  const fireNextClick = () => {
    if (disableNext) return;
    nav.emit("nextClick");
    handleNextClick();
  };

  console.log("navpair: hidenext:" + hideNext);

  return (
    <>
      {hasPrev && !showStart && (
        <GhostIconButton
          onClick={handlePrevClick}
          disabled={disablePrev}
          aria-label={labelPrev}
          shake={false}
          className={clsx(btnClass(disablePrev), sizeClass, hoverClass)}
        >
          <IconPrev size={24} className={iconClass(disablePrev)} />
        </GhostIconButton>
      )}

      {showStart ? (
        <div className={startWrapperClass}>
          <button
            type="button"
            onMouseEnter={fireNextHoverStart}
            onMouseLeave={fireNextHoverEnd}
            onClick={fireNextClick}
            disabled={disableNext}
            aria-label="Starta guiden"
            className={clsx(
              "inline-flex items-center gap-3 rounded-full",
              "px-14 py-4 md:px-14 md:py-4",          // <-- bigger
              "text-base md:text-lg font-semibold",  // <-- bigger
              "bg-wizard-surface border border-wizard-stroke/20",
              "text-darkLimeGreen",
              "shadow-sm",
              "hover:bg-wizard-surface/80 hover:scale-[1.03] transition-transform duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-darkLimeGreen/50",
              "shadow-[0_0_0_1px_rgba(120,255,120,0.15),0_10px_30px_rgba(0,0,0,0.18)]",
              disableNext && "opacity-50 cursor-not-allowed hover:scale-100"
            )}
          >
            Starta
            <ArrowRight size={22} className={disableNext ? "text-darkLimeGreen/40" : "text-darkLimeGreen"} />
          </button>
        </div>
      ) : (
        !hideNext && hasNext && (
          <GhostIconButton
            onMouseEnter={fireNextHoverStart}
            onMouseLeave={fireNextHoverEnd}
            onClick={fireNextClick}
            disabled={disableNext}
            aria-label={labelNext}
            shake={showShakeAnimation}
            className={clsx(btnClass(disableNext), sizeClass, hoverClass, !hasPrev && "ml-auto")}
          >
            <IconNext size={24} className={iconClass(disableNext)} />
          </GhostIconButton>
        )
      )}
    </>
  );
};

export default WizardNavPair;
