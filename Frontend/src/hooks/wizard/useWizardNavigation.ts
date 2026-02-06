import { useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { handleStepValidation } from '@components/organisms/overlays/wizard/validation/handleStepValidation';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import { useWizardSessionStore } from '@/stores/Wizard/wizardSessionStore';
import { FINAL_SUMMARY_UNLOCK } from '@/components/organisms/overlays/wizard/SharedComponents/Const/wizardEntitlements';


interface UseWizardNavigationProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  totalSteps: number;
  stepRefs: Record<number, React.RefObject<any>>;
  setTransitionLoading(v: boolean): void;
  setCurrentStepState(v: React.SetStateAction<Record<number, { subStep: number; data: any }>>): void;
  handleSaveStepData(stepNumber: number, subStep: number, data: any, goingBackwards: boolean): Promise<boolean>;
  // 'setWizardData' is officially removed.
  triggerShakeAnimation(duration?: number): void;
  isDebugMode: boolean;
  setShowSideIncome(v: boolean): void;
  setShowHouseholdMembers(v: boolean): void;

}

const getDefaultSubStepForEnter = (
  targetStep: number,
  direction: "next" | "prev"
): number | undefined => {
  // Hard overrides (your special cases)
  if (targetStep === 4 && direction === "prev") return 3; // Debts always restart on back: THIS IS CURRENTLY DISABLED, I DONT KNOW IF ITS GOOD UX. LETS THINK ABOUT IT.
  // Honestly, the step is short + they have an option at the final summary to go directly to the substep they want, so maybe we can just let them back into the last substep they were on instead of forcing them to start over.
  return undefined;
};

const getEnterSubStep = (
  targetStep: number,
  direction: "next" | "prev"
): number => {
  // 1) Always honor hard overrides first
  const policy = getDefaultSubStepForEnter(targetStep, direction);
  if (policy != null) return policy;

  // 2) Default behavior: forward = start, back = last substep
  if (direction === "next") return 1;

  const lastSubByStep: Record<number, number> = {
    2: 8, // Expenditure 
    3: 4, // Savings
    4: 3, // Debts (won't be used on prev due to override above)

  };

  return lastSubByStep[targetStep] ?? 1;
};
const useWizardNavigation = ({
  step,
  setStep,
  totalSteps,
  stepRefs,
  setTransitionLoading,
  setCurrentStepState,
  handleSaveStepData,
  triggerShakeAnimation,
  isDebugMode,
  setShowSideIncome,
  setShowHouseholdMembers,


}: UseWizardNavigationProps) => {
  const { showToast } = useToast();

  const setLastVisitedSubStep = useWizardDataStore((state) => state.setLastVisitedSubStep);

  const bumpEntitlement = useWizardSessionStore((s) => s.bumpEntitlement);

  const SUMMARY_SUBSTEPS: Record<number, Set<number>> = {
    2: new Set([8]),     // Expenditure summary
    3: new Set([4]),    // Savings summary
    //4: new Set([3]), // Debts currently sends data on summary
  };
  const FINAL_EDIT_TARGETS = {
    income: { step: 1, sub: 1 },
    expenditure: { step: 2, sub: 1 },
    savingsHabit: { step: 3, sub: 2 },
    savingsGoals: { step: 3, sub: 3 },
    debts: { step: 4, sub: 2 },
    debtsStrategy: { step: 4, sub: 3 },
  } as const;

  function isSummarySubStep(step: number, sub: number) {
    return SUMMARY_SUBSTEPS[step]?.has(sub) ?? false;
  }

  const navigateStep = useCallback(async (direction: "next" | "prev") => {
    if (step === 0) {
      setStep(prev =>
        direction === "next"
          ? Math.min(prev + 1, totalSteps)
          : Math.max(prev - 1, 0)
      );
      return;
    }
    setTransitionLoading(true);

    if (step === 0) {
      setStep(prev => direction === "next" ? Math.min(prev + 1, totalSteps) : Math.max(prev - 1, 0));
      setTransitionLoading(false);
      return;
    }

    const ref = stepRefs[step];
    const api = ref?.current;
    if (!api) { setTransitionLoading(false); return; }

    const goingBack = direction === "prev";
    const currentSub = api.getCurrentSubStep?.() ?? 1;

    // validate / collect data
    let dataForSave: any = null;
    if (goingBack) {
      console.log("[NAV api keys]", Object.keys(api));
      console.log("[NAV has partial?]", typeof api.getPartialDataForSubStep);
      dataForSave = api.getStepData();
    } else {
      const isComplex = typeof api.hasSubSteps === "function";

      if (isComplex) {
        dataForSave =
          typeof api.getPartialDataForSubStep === "function"
            ? api.getPartialDataForSubStep(currentSub)
            : api.getStepData();
      } else {
        dataForSave = await handleStepValidation(step, stepRefs, setShowSideIncome, setShowHouseholdMembers);
      }

      if (!dataForSave) {
        triggerShakeAnimation();
        setTransitionLoading(false);
        return;
      }
    }
    console.log('[NAV] useWizardNavigation called', { stepNumber: step, subStepNumber: currentSub, dataToSave: dataForSave });
    // persist (skip summary)
    const skipPersist = !goingBack && isSummarySubStep(step, currentSub);
    let saveSuccess = true;

    if (!skipPersist) {
      saveSuccess = await handleSaveStepData(step, currentSub, dataForSave, goingBack);
      if (!saveSuccess) { setTransitionLoading(false); return; }

      // unlock only after debts summary saved (4,3)
      if (!goingBack && step === FINAL_SUMMARY_UNLOCK.major && currentSub === FINAL_SUMMARY_UNLOCK.sub) {
        bumpEntitlement(step, currentSub);
        console.log("[ENTITLEMENT] final summary unlocked via", FINAL_SUMMARY_UNLOCK);
      }
    }

    // cache
    setCurrentStepState(prev => ({
      ...prev,
      [step]: { ...(prev[step] ?? {}), subStep: currentSub, data: dataForSave },
    }));
    setLastVisitedSubStep(step, currentSub);

    // move
    const targetStep = direction === "next" ? step + 1 : step - 1;
    const targetSub = getEnterSubStep(targetStep, direction);

    setCurrentStepState(prev => ({
      ...prev,
      [targetStep]: { ...(prev[targetStep] ?? {}), subStep: targetSub },
    }));

    setStep(prev => direction === "next" ? Math.min(prev + 1, totalSteps) : Math.max(prev - 1, 0));

    queueMicrotask(() => stepRefs[targetStep]?.current?.setSubStep?.(targetSub));
    setTransitionLoading(false);
  },
    // The dependency array is now cleaner
    [
      step,
      totalSteps,
      stepRefs,
      setTransitionLoading,
      setCurrentStepState,
      handleSaveStepData,
      triggerShakeAnimation,
      isDebugMode,
      setShowSideIncome,
      setShowHouseholdMembers,
      showToast,
      setStep,
      setLastVisitedSubStep,
      bumpEntitlement,
    ]
  );

  const nextStep = useCallback(() => navigateStep('next'), [navigateStep]);
  const prevStep = useCallback(() => navigateStep('prev'), [navigateStep]);
  const jumpTo = useCallback(async (targetStep: number, targetSub: number) => {
    // bounds
    if (targetStep < 0 || targetStep > totalSteps) return;

    setTransitionLoading(true);

    // update cache/state (optional but nice)
    setCurrentStepState(prev => ({
      ...prev,
      [targetStep]: { ...(prev[targetStep] ?? {}), subStep: targetSub },
    }));
    setLastVisitedSubStep(targetStep, targetSub);

    // move major step
    setStep(() => targetStep);

    // ensure substep is applied after step render/ref attach
    queueMicrotask(() => {
      stepRefs[targetStep]?.current?.setSubStep?.(targetSub);
    });

    setTransitionLoading(false);
  }, [
    totalSteps,
    stepRefs,
    setTransitionLoading,
    setCurrentStepState,
    setLastVisitedSubStep,
    setStep,
  ]);


  return { nextStep, prevStep, jumpTo };
};

export default useWizardNavigation;