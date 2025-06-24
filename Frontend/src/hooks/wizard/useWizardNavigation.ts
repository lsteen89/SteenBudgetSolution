import { useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { handleStepValidation } from '@components/organisms/overlays/wizard/validation/handleStepValidation';

interface UseWizardNavigationProps {
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  totalSteps: number;
  stepRefs: Record<number, React.RefObject<any>>;
  setTransitionLoading(v: boolean): void;
  setCurrentStepState(
    v: React.SetStateAction<Record<number, { subStep: number; data: any }>>
  ): void;
  handleSaveStepData(
    stepNumber: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ): Promise<boolean>;
  setWizardData(
    v: React.SetStateAction<
      Record<number, { lastVisitedSubStep?: number }>
    >
  ): void;
  triggerShakeAnimation(duration?: number): void;
  isDebugMode: boolean;
  setShowSideIncome(v: boolean): void;
  setShowHouseholdMembers(v: boolean): void;
}


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

  const navigateStep = useCallback(
    async (direction: 'next' | 'prev') => {
      console.log(
        `%cTHE GREAT ROAD: A request to navigate '${direction}' from step ${step} has begun.`,
        'color: #FFD700; background: #333; font-weight: bold; padding: 2px 5px; border-radius: 3px;'
      );
      setTransitionLoading(true);

      const ref = stepRefs[step];
      const onRealStep = step > 0 && ref?.current;
      const goingBack = direction === 'prev';

      const isComplexStep = onRealStep && ref.current.hasSubSteps ? ref.current.hasSubSteps() : false;

      let validatedData: any | null = null;


      if (!goingBack && onRealStep) {
        if (isComplexStep) {
          validatedData = ref.current.getStepData();
        } else {

          validatedData = await handleStepValidation(
            step,
            stepRefs,
            setShowSideIncome,
            setShowHouseholdMembers
          );
        }


        if (!validatedData) {
          triggerShakeAnimation();
          setTransitionLoading(false);
          return; // MISSION ABORTED. HOLD POSITION.
        }
      }
      

      /* 3. API save ( skip on step 0 ) */
      let saveSuccess = true;
      if (onRealStep) {

        const dataToSave = goingBack ? ref.current.getStepData() : validatedData;
        const currentSub = ref.current.getCurrentSubStep?.() ?? 1;

        saveSuccess = await handleSaveStepData(
          step,
          currentSub,
          dataToSave,
          goingBack
        );

        if (!saveSuccess && !isDebugMode) {
          showToast(
            '🚨 Ett fel uppstod – försök igen eller kontakta support.',
            'error'
          );
          setTransitionLoading(false);
          return;
        }
      }

      /* 4. Update local caches *only* after successful save */
      if (onRealStep && saveSuccess) {
        const dataForCache = goingBack ? ref.current.getStepData() : validatedData;
        const currentSub = ref.current.getCurrentSubStep?.() ?? 1;
        
        setCurrentStepState((prev) => ({
          ...prev,
          [step]: { subStep: currentSub, data: dataForCache },
        }));

        setWizardData((prev) => ({
          ...prev,
          [step]: { ...prev[step], lastVisitedSubStep: currentSub },
        }));
      }


      setStep((prev) =>
        direction === 'next'
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

  const nextStep = useCallback(() => navigateStep('next'), [navigateStep]);
  const prevStep = useCallback(() => navigateStep('prev'), [navigateStep]);

  return { nextStep, prevStep };
};

export default useWizardNavigation;