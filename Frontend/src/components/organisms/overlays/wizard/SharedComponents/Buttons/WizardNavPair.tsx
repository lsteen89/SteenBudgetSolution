import { useWizardNavEvents } from "@/components/organisms/overlays/wizard/SharedComponents/Nav/WizardNavEvents";
import { useAppLocale } from "@/hooks/i18n/useAppLocale";
import { tDict } from "@/utils/i18n/translate";
import GhostIconButton from "@components/atoms/buttons/GhostIconButton";
import clsx from "clsx";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import React from "react";

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
  initError?: boolean;
}

const wizardNavPairDict = {
  sv: {
    prevMajor: "Föregående huvudsteg",
    prevSub: "Föregående delsteg",
    nextMajor: "Nästa huvudsteg",
    nextSub: "Nästa delsteg",
    startAria: "Starta guiden",
    start: "Starta",
  },
  en: {
    prevMajor: "Previous main step",
    prevSub: "Previous substep",
    nextMajor: "Next main step",
    nextSub: "Next substep",
    startAria: "Start the guide",
    start: "Start",
  },
  et: {
    prevMajor: "Eelmine põhietapp",
    prevSub: "Eelmine alametapp",
    nextMajor: "Järgmine põhietapp",
    nextSub: "Järgmine alametapp",
    startAria: "Alusta juhendit",
    start: "Alusta",
  },
} as const;

const WizardNavPairComponent: React.FC<WizardNavPairProps> = ({
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
  hideNext = false,
  initError,
}) => {
  const nav = useWizardNavEvents();

  const locale = useAppLocale();
  const t = <K extends keyof typeof wizardNavPairDict.sv>(k: K) =>
    tDict(k, locale, wizardNavPairDict);

  const isLocked =
    isSaving ||
    (!isDebugMode &&
      (initLoading || transitionLoading || (connectionError && step === 0)));

  const disablePrev = isLocked || !hasPrev || isActionBlocked;
  const disableNext = isLocked || !hasNext || isActionBlocked;

  const isPrevMajor = !hasPrevSub;
  const isNextMajor = !hasNextSub;

  // Major = double chevrons, Sub = single chevron
  const IconPrev = isPrevMajor ? ChevronsLeft : ChevronLeft;
  const IconNext = isNextMajor ? ChevronsRight : ChevronRight;

  const labelPrev = isPrevMajor ? t("prevMajor") : t("prevSub");
  const labelNext = isNextMajor ? t("nextMajor") : t("nextSub");

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
    !showShakeAnimation &&
    "hover:bg-customBlue2 hover:scale-105 transition-transform duration-150";
  const btnClass = (disabled: boolean) =>
    clsx(
      disabled && "opacity-50 cursor-not-allowed",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-darkLimeGreen/50",
    );

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
      {!initError ? (
        showStart ? (
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
                "px-14 py-4 md:px-14 md:py-4",
                "text-base md:text-lg font-semibold",
                "bg-wizard-surface border border-wizard-stroke/20",
                "text-darkLimeGreen",
                "shadow-sm",
                "hover:bg-wizard-surface/80 hover:scale-[1.03] transition-transform duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-darkLimeGreen/50",
                "shadow-[0_0_0_1px_rgba(120,255,120,0.15),0_10px_30px_rgba(0,0,0,0.18)]",
                disableNext && "opacity-50 cursor-not-allowed hover:scale-100",
              )}
            >
              {t("start")}
              <ArrowRight
                size={22}
                className={
                  disableNext ? "text-darkLimeGreen/40" : "text-darkLimeGreen"
                }
              />
            </button>
          </div>
        ) : (
          !hideNext &&
          hasNext && (
            <GhostIconButton
              onMouseEnter={fireNextHoverStart}
              onMouseLeave={fireNextHoverEnd}
              onClick={fireNextClick}
              disabled={disableNext}
              aria-label={labelNext}
              shake={showShakeAnimation}
              className={clsx(
                btnClass(disableNext),
                sizeClass,
                hoverClass,
                !hasPrev && "ml-auto",
              )}
            >
              <IconNext size={24} className={iconClass(disableNext)} />
            </GhostIconButton>
          )
        )
      ) : null}
    </>
  );
};

const WizardNavPair = React.memo(WizardNavPairComponent);
export default WizardNavPair;
