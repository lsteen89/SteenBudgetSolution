import { useCallback } from "react";
import { useToast } from "@context/ToastContext";
import { handleStepValidation } from
  "@components/organisms/overlays/wizard/validation/handleStepValidation";

/* ------------------------------------------------------------------ */
/* Hook props                                                         */
/* ------------------------------------------------------------------ */
interface UseWizardNavigationProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;

  totalSteps: number;

  /* refs to every major-step component (index == major-step) */
  stepRefs: Record<number, React.RefObject<any>>;

  /* global UI-locks / spinners */
  setTransitionLoading(v: boolean): void;

  /* local cache of form-snapshots */
  setCurrentStepState(
    v: React.SetStateAction<Record<number, { subStep: number; data: any }>>
  ): void;

  /* server-side save supplied by parent */
  handleSaveStepData(
    stepNumber: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ): Promise<boolean>;

  /* wizard meta-data (last visited sub-step) */
  setWizardData(
    v: React.SetStateAction<
      Record<number, { lastVisitedSubStep?: number }>
    >
  ): void;

  /* misc helpers */
  triggerShakeAnimation(duration?: number): void;
  isDebugMode: boolean;
  setShowSideIncome(v: boolean): void;
  setShowHouseholdMembers(v: boolean): void;
}

/* ------------------------------------------------------------------ */
/* The hook                                                            */
/* ------------------------------------------------------------------ */
const useWizardNavigation = ({
  step,
  setStep,
  totalSteps,
  stepRefs,
  setTransitionLoading,
  setCurrentStepState,
  handleSaveStepData,
  setWizardData,
  triggerShakeAnimation,
  isDebugMode,
  setShowSideIncome,
  setShowHouseholdMembers,
}: UseWizardNavigationProps) => {
  const { showToast } = useToast();

  /* ================================================================ */
  /* One unified handler for both “next” and “prev”                    */
  /* ================================================================ */
  const navigateStep = useCallback(
    async (direction: "next" | "prev") => {
      /* -------------------------------------------------------------- */
      /* 1. Prep & collect info                                         */
      /* -------------------------------------------------------------- */
      setTransitionLoading(true);

      const ref           = stepRefs[step];
      const onRealStep    = step > 0 && ref?.current;
      const currentSub    = onRealStep
        ? ref.current.getCurrentSubStep?.() ?? 1
        : 1;
      const currentData   = onRealStep ? ref.current.getStepData() : undefined;
      const goingBack     = direction === "prev";

      /* -------------------------------------------------------------- */
      /* 2. Client-side validation (only when moving forward)           */
      /* -------------------------------------------------------------- */
      if (!goingBack && onRealStep) {
        const valid = await handleStepValidation(
          step,
          stepRefs,
          setShowSideIncome,
          setShowHouseholdMembers
        );
        if (!valid) {
          triggerShakeAnimation();
          setTransitionLoading(false);
          return;
        }
      }

      /* -------------------------------------------------------------- */
      /* 3. API save ( skip on step 0 )                                 */
      /* -------------------------------------------------------------- */
      let saveSuccess = true;
      if (onRealStep) {
        saveSuccess = await handleSaveStepData(
          step,
          currentSub,
          currentData,
          goingBack
        );

        /* Failed → keep user on page, keep old cache */
        if (!saveSuccess && !isDebugMode) {
          showToast(
            "🚨 Ett fel uppstod – försök igen eller kontakta support.",
            "error"
          );
          setTransitionLoading(false);
          return;
        }
      }

      /* -------------------------------------------------------------- */
      /* 4. Update local caches *only* after successful save            */
      /* -------------------------------------------------------------- */
      if (onRealStep && saveSuccess) {
        /* snapshot of the form */
        setCurrentStepState(prev => ({
          ...prev,
          [step]: { subStep: currentSub, data: currentData },
        }));

        /* remember last visited sub-step for each major-step */
        setWizardData(prev => ({
          ...prev,
          [step]: { ...prev[step], lastVisitedSubStep: currentSub },
        }));
      }

      /* -------------------------------------------------------------- */
      /* 5. Finally change major-step index                             */
      /* -------------------------------------------------------------- */
      setStep(prev =>
        direction === "next"
          ? Math.min(prev + 1, totalSteps)
          : Math.max(prev - 1, 0)
      );

      setTransitionLoading(false);
    },
    [
      step,
      totalSteps,
      stepRefs,
      setTransitionLoading,
      setCurrentStepState,
      handleSaveStepData,
      setWizardData,
      triggerShakeAnimation,
      isDebugMode,
      setShowSideIncome,
      setShowHouseholdMembers,
      showToast,
      setStep,
    ]
  );

  /* public helpers */
  const nextStep = useCallback(() => navigateStep("next"), [navigateStep]);
  const prevStep = useCallback(() => navigateStep("prev"), [navigateStep]);

  return { nextStep, prevStep };
};

export default useWizardNavigation;
