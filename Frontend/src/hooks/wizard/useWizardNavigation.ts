import { useCallback } from 'react';
import { useToast } from '@context/ToastContext';
import { handleStepValidation } from '@components/organisms/overlays/wizard/validation/handleStepValidation';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';


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

  const navigateStep = useCallback(
    async (direction: 'next' | 'prev') => {
      console.log(
        `%cTHE GREAT ROAD: Navigating '${direction}' from step ${step}...`,
        'color: #FFD700;'
      );
      setTransitionLoading(true);

      const ref = stepRefs[step];
      const onRealStep = step > 0 && ref?.current;
      const goingBack = direction === 'prev';

      let validatedData: any | null = null;

      // 1. If we're going back, we don't validate, we just get the data.
      if (!goingBack && onRealStep) {
        const isComplexStep = typeof ref.current.hasSubSteps === 'function';

        if (isComplexStep) {
          // 2. For complex steps like 'Expenditure', we do NOT run the global validation.
          // We trust that its internal sub-steps are valid. We simply get its current data to be saved.
          console.log(
            'Navigating from a complex step. Skipping global validation, just getting data.'
          );
          validatedData = ref.current.getStepData();
        } else {
          // 3. For simple steps like 'Income', we cast the great validation spell as before.
          console.log('Navigating from a simple step. Running global validation.');
          validatedData = await handleStepValidation(
            step,
            stepRefs,
            setShowSideIncome,
            setShowHouseholdMembers
          );
        }

        // 4. If either path failed to produce data, the journey is halted.
        if (!validatedData) {
          triggerShakeAnimation();
          setTransitionLoading(false);
          return;
        }
      }

      // 2. If we're going back, we still validate the current step's data.
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
        // ... error handling ...
      }

      // 4. Update local caches *only* after successful save
      if (onRealStep && saveSuccess) {
        const dataForCache = goingBack
          ? ref.current.getStepData()
          : validatedData;
        const currentSub = ref.current.getCurrentSubStep?.() ?? 1;

        // This part is for temporary component state, it's fine.
        setCurrentStepState(prev => ({
          ...prev,
          [step]: {
            ...(prev[step] ?? {}),
            subStep: currentSub,
            data: dataForCache,
          },
        }));
        setLastVisitedSubStep(step, currentSub);

        // --- THE MAGIC IS REPLACED ---
        // Instead of calling a prop, we use the action we summoned from the store.
        setLastVisitedSubStep(step, currentSub);
      }

      // --- New Sub-step Targeting Logic ---
      const targetStep = direction === 'next' ? step + 1 : step - 1;

      const { getLastVisitedSubStep } = useWizardDataStore.getState();

      let targetSubStep = 1;
      // If the destination is a complex step, decide now from metadata (ref may be null until mount)
      const destHasSubSteps =
        !!stepRefs[targetStep]?.current?.hasSubSteps ||
        // fallback: infer from last visited (if we ever stored one, it’s complex)
        (getLastVisitedSubStep(targetStep) !== undefined);

      if (destHasSubSteps) {
        const lastVisited = getLastVisitedSubStep(targetStep);
        if (goingBack) {
          // Policy: go back to last visited if known; else 1 (or pick “end” if you prefer)
          targetSubStep = lastVisited ?? 1;
        } else {
          // Policy: forward resumes if known; else 1
          targetSubStep = lastVisited ?? 1;
        }
      }

      // Update local UI cache safely (don’t spread undefined)
      setCurrentStepState(prev => ({
        ...prev,
        [targetStep]: { ...(prev[targetStep] ?? {}), subStep: targetSubStep },
      }));
      // --- End of New Logic ---
      // --- Step Change Logic ---
      // ... Step change logic remains the same ...
      setStep(prev =>
        direction === 'next' ? Math.min(prev + 1, totalSteps) : Math.max(prev - 1, 0)
      );

      // Give React a tick to mount, then sync the child’s internal state (if it has one)
      queueMicrotask(() => {
        const destinationRef = stepRefs[targetStep]?.current;
        destinationRef?.setSubStep?.(targetSubStep);
      });

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
      setLastVisitedSubStep, // Add the new dependency
    ]
  );

  const nextStep = useCallback(() => navigateStep('next'), [navigateStep]);
  const prevStep = useCallback(() => navigateStep('prev'), [navigateStep]);

  return { nextStep, prevStep };
};

export default useWizardNavigation;