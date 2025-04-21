import { useState, useRef, useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { handleStepValidation } from '@components/organisms/overlays/wizard/validation/handleStepValidation';

interface UseWizardNavigationProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  totalSteps: number;
  stepRefs: Record<number, React.RefObject<any>>;
  setTransitionLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentStepState: React.Dispatch<React.SetStateAction<Record<number, any>>>;
  handleSaveStepData: (stepNumber: number, subStep: number, data: any, goingBackwards: boolean) => Promise<boolean>;
  setWizardData: React.Dispatch<React.SetStateAction<Record<number, { lastVisitedSubStep?: number }>>>;
  triggerShakeAnimation: (duration?: number) => void;
  isDebugMode: boolean;
  setShowSideIncome: (value: boolean) => void;
  setShowHouseholdMembers: (value: boolean) => void;
}

/**
 * A custom hook that manages the navigation logic for a multi-step wizard.
 * It handles moving between steps, saving the current step's state,
 * validating steps, and updating the wizard's overall data.
 */
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

  const navigateStep = useCallback(async (direction: 'next' | 'prev') => {
    setTransitionLoading(true);

    const stepRef = stepRefs[step];
    let currentSubStepForSave: number | undefined;
    let currentFormData: Record<string, any> | undefined;

    if (step > 0 && stepRef?.current) {
      currentSubStepForSave = stepRef.current.getCurrentSubStep ? stepRef.current.getCurrentSubStep() : 1;
      currentFormData = stepRef.current.getStepData();

      setCurrentStepState(prev => ({
        ...prev,
        [step]: {
          subStep: currentSubStepForSave,
          data: currentFormData,
        },
      }));
    }
    console.log("Current step data:", { step, currentSubStepForSave, currentFormData });
    let shouldProceed = true;
    if (direction === 'next' && step > 0) {
      const isStepValid = await handleStepValidation(step, stepRefs, setShowSideIncome, setShowHouseholdMembers);
      if (!isStepValid) {
        triggerShakeAnimation();
        shouldProceed = false;
      }
    }

    if (shouldProceed) {
      if (step > 0 && stepRef?.current) {
        const data = stepRef.current.getStepData();
        const subStep = stepRef.current.getCurrentSubStep ? stepRef.current.getCurrentSubStep() : 1;
        const goingBackwards = direction === 'prev';
        const saveSuccess = await handleSaveStepData(step, subStep, data, goingBackwards);

        if (step > 0) {
          setWizardData((prevData: Record<number, { lastVisitedSubStep?: number }>) => ({
            ...prevData,
            [step]: {
              ...prevData?.[step],
              lastVisitedSubStep: currentSubStepForSave,
            },
          }));

          if (!saveSuccess && !isDebugMode) {
            setTransitionLoading(false);
            showToast("🚨 Ett fel uppstod – försök igen eller kontakta support.", "error");
            return;
          }
        }
      }

      setStep((prev) =>
        direction === 'next' ? Math.min(prev + 1, totalSteps) : Math.max(prev - 1, 0)
      );
    }

    setTransitionLoading(false);
  }, [
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
    showToast,
    setShowSideIncome,
    setShowHouseholdMembers,
  ]);

  const nextStep = useCallback(() => {
    navigateStep('next');
  }, [navigateStep]);

  const prevStep = useCallback(() => {
    navigateStep('prev');
  }, [navigateStep]);

  return { navigateStep, nextStep, prevStep };
};

export default useWizardNavigation;