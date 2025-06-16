import { useCallback } from "react";
import { useToast } from "@context/ToastContext";
import { handleStepValidation } from "@components/organisms/overlays/wizard/validation/handleStepValidation";
import { FieldErrors } from "react-hook-form";

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
/* The hook                                                           */
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
  /* One unified handler for both “next” and “prev”                   */
  /* ================================================================ */
  const navigateStep = useCallback(
    async (direction: "next" | "prev") => {
      /* -------------------------------------------------------------- */
      /* 1. Prep & collect info                                         */
      /* -------------------------------------------------------------- */
      setTransitionLoading(true);

      const ref = stepRefs[step];
      const onRealStep = step > 0 && ref?.current;
      const goingBack = direction === "prev";

      /* -------------------------------------------------------------- */
      /* 2. Client-side validation (only when moving forward)           */
      /* -------------------------------------------------------------- */
      let validatedData: any | null = null; // Will hold our clean data on success

      if (!goingBack && onRealStep) {
        // Call our updated validation function which returns clean data or null
        validatedData = await handleStepValidation(
          step,
          stepRefs,
          setShowSideIncome,
          setShowHouseholdMembers
        );

        // NEW: Check if it returned null (which signifies validation failure)
        if (!validatedData) {
          // If validation fails, find the first error and scroll to it.
          const errors = ref.current.getErrors?.() as FieldErrors;
          if (errors) {
            const firstErrorName = Object.keys(errors)[0];
            if (firstErrorName) {
              // Use querySelector for reliability with nested field names
              const errorField = document.querySelector(`[name="${firstErrorName}"]`);
              errorField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
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
        // NEW: Determine the correct data to save.
        // If moving forward, use the clean data from our validation step.
        // If going backward, get the raw data since validation was skipped.
        const dataToSave = goingBack ? ref.current.getStepData() : validatedData;
        const currentSub = ref.current.getCurrentSubStep?.() ?? 1;

        saveSuccess = await handleSaveStepData(
          step,
          currentSub,
          dataToSave, // Use the corrected data object
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
        // NEW: Also use the clean/correct data for the local snapshot.
        const dataForCache = goingBack ? ref.current.getStepData() : validatedData;
        const currentSub = ref.current.getCurrentSubStep?.() ?? 1;
        
        /* snapshot of the form */
        setCurrentStepState((prev) => ({
          ...prev,
          [step]: { subStep: currentSub, data: dataForCache },
        }));

        /* remember last visited sub-step for each major-step */
        setWizardData((prev) => ({
          ...prev,
          [step]: { ...prev[step], lastVisitedSubStep: currentSub },
        }));
      }

      /* -------------------------------------------------------------- */
      /* 5. Finally change major-step index                             */
      /* -------------------------------------------------------------- */
      setStep((prev) =>
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