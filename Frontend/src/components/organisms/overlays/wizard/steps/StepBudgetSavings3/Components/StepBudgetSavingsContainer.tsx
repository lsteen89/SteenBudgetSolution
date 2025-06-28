import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';

import { Step3FormValues } from '@/types/Wizard/Step3FormValues';
import { ensureStep3Defaults } from '@/utils/wizard/ensureStep3Defaults';
import { useSaveStepData } from '@hooks/wizard/useSaveStepData';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import useMediaQuery from '@hooks/useMediaQuery';

import WizardProgress from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import WizardFormWrapperStep3, {
  WizardFormWrapperStep3Ref,
} from './wrapper/WizardFormWrapperStep3';

// --- Sub-Step Pages and Icons
import { Info, PiggyBank, Target, ShieldCheck } from 'lucide-react';
import SubStepIntro from './Pages/SubSteps/1_SubStepIntro/SubStepIntro';
import SubStepHabits from './Pages/SubSteps/2_SubStepHabits/SubStepHabits';
import SubStepGoals from './Pages/SubSteps/3_SubStepGoals/SubStepGoals';
import SubStepConfirm from './Pages/SubSteps/4_SubStepConfirm/SubStepConfirm';

/* ------------------------------------------------------------------ */
/* INTERFACES                             */
/* ------------------------------------------------------------------ */
export interface StepBudgetSavingsContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step3FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step3FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
}

interface StepBudgetSavingsContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step3FormValues>;
  /**
   * Initial data to hydrate the form with.
   * Should be a partial object matching Step3FormValues.
   */
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

function getSavingsPartialData(
  subStep: number,
  allData: Step3FormValues
): Partial<Step3FormValues> {
  switch (subStep) {
    case 1: return { intro: allData.intro };
    case 2: return { habits: allData.habits };
    case 3: return { goals: allData.goals };
    default: return {};
  }
}

/* ------------------------------------------------------------------ */
/* COMPONENT IMPLEMENTATION                       */
/* ------------------------------------------------------------------ */
const StepBudgetSavingsContainer = forwardRef<
  StepBudgetSavingsContainerRef,
  StepBudgetSavingsContainerProps
>((props, ref) => {
  const {
    onSaveStepData,
    stepNumber,
    initialData = {},
    onNext,
    onPrev,
    loading: parentLoading,
    initialSubStep,
    onSubStepChange,
  } = props;

  const isMobile = useMediaQuery('(max-width: 1367px)');
  const hasHydrated = useRef(false);

  /* 1 ─── Hydrate slice once --------------------------------------- */
  const { setSavings } = useWizardDataStore();
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0 && !hasHydrated.current) {
      const completeData = ensureStep3Defaults(initialData);
      setSavings(completeData);
      hasHydrated.current = true;
    }
  }, [initialData, setSavings]);

  /* 2 ─── refs & local state --------------------------------------- */
  const [isSaving, setIsSaving] = useState(false);
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [skippedHabits, setSkippedHabits] = useState(false);
  const [formMethods, setFormMethods] =
    useState<UseFormReturn<Step3FormValues> | null>(null);

  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback(
    (instance: WizardFormWrapperStep3Ref | null) => {
      if (instance && !hasSetMethods.current) {
        setFormMethods(instance.getMethods());
        hasSetMethods.current = true;
      }
    },
    []
  );

  /* 3 ─── save-hook ------------------------------------------------ */
  const { saveStepData } = useSaveStepData<Step3FormValues>({
    stepNumber,
    methods: formMethods ?? undefined,
    isMobile,
    onSaveStepData,
    setCurrentStep: setCurrentSub,
    onError: () => props.onValidationError?.(),
    getPartialDataForSubstep: getSavingsPartialData,
  });

  /* 4 ─── navigation helpers --------------------------------------- */
  const totalSteps = 4;

const goToSub = async (dest: number) => {
    const goingBack = dest < currentSub;
    // We only skip validation if going backwards.
    // When moving forward, even from sub-step 1, saveStepData will now perform the validation.
    const skipValidation = goingBack;

    setIsSaving(true);
    // saveStepData will now handle validation and return true/false.
    const wasSuccessful = await saveStepData(currentSub, dest, skipValidation, goingBack);
    setIsSaving(false);

    // Only proceed to the next sub-step if the validation and save were successful.
    if (wasSuccessful) {
        setCurrentSub(dest);
    }
  };

  // This function is used to skip the habit step based on the user's choice.
  // If the user chooses to skip, we go directly to sub-step 3 (Goals).
  // Its also the main function for moving to the next sub-step.
  const next = async () => {
    // Logic for skipping habit step
    if (currentSub === 1) {
      // We no longer validate here. Just get the value and let goToSub handle the rest.
      const answer = formMethods?.getValues('intro.savingHabit');
      const skip = answer === 'start' || answer === 'no';
      await goToSub(skip ? 3 : 2);
      return;
    }

    if (currentSub < totalSteps) {
      // For all other forward movements, just call goToSub.
      await goToSub(currentSub + 1);
    } else {
      // When at the last sub-step, we call onNext to let the parent wizard
      // trigger the FINAL validation for the whole of Step 3.
      onNext();
    }
  };

  const prev = () => {
    let destinationSub = currentSub - 1;
    if (currentSub === 3 && skippedHabits) {
      destinationSub = 1;
    }

    if (destinationSub >= 1) {
      goToSub(destinationSub);
    } else {
      onPrev();
    }
  };

  /* 5 ─── progress click handlers ---------------------------------- */
  const clickProgress = (d: number) => goToSub(d);

  /* 6 ─── notify parent of sub-step -------------------------------- */
  useEffect(() => {
    console.log(
      `%cTHE CHILD PROCLAIMS: Sub-step is now ${currentSub}. Notifying parent...`,
      'color: cyan;',
      `(Is onSubStepChange a function? ${typeof onSubStepChange === 'function'})`
    );

    onSubStepChange?.(currentSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSub]);

  /* 7 ─── imperative API ------------------------------------------- */
  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
    getStepData: () => formMethods?.getValues() ?? ensureStep3Defaults({}),
    markAllTouched: () => formMethods?.trigger(),
    getErrors: () => formMethods?.formState.errors ?? {},
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => (currentSub === 3 && skippedHabits) || currentSub > 1,
    hasNextSub: () => currentSub < totalSteps,
    isSaving: () => isSaving,
    hasSubSteps: () => true,
  }));

  /* 8 ─── render helpers ------------------------------------------- */
  const steps = [
    { icon: Info, label: 'Intro' },
    { icon: PiggyBank, label: 'Vanor' },
    { icon: Target, label: 'Mål' },
    { icon: ShieldCheck, label: 'Bekräfta' },
  ];

  const renderSubStep = () => {
    switch (currentSub) {
      case 1: return <SubStepIntro />;
      case 2: return <SubStepHabits />;
      case 3: return <SubStepGoals />;
      case 4: return <SubStepConfirm />;
      default: return <div>All sub-steps complete!</div>;
    }
  };

  /* 9 ─── JSX ------------------------------------------------------- */
  return (
    <WizardFormWrapperStep3 ref={handleFormWrapperRef}>
      {parentLoading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <LoadingScreen full textColor="black" />
        </div>
      ) : (
        <form className="flex flex-col h-full">
          {isSaving && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <LoadingScreen full={false} actionType="save" textColor="black" />
            </div>
          )}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex-1 text-center">
              {isMobile ? (
                <StepCarousel
                  steps={steps}
                  currentStep={currentSub - 1}
                />
              ) : (
                <WizardProgress
                  step={currentSub}
                  totalSteps={totalSteps}
                  steps={steps}
                  adjustProgress
                  onStepClick={clickProgress}
                />
              )}
            </div>
          </div>
          <div className="flex-1">
            <AnimatedContent animationKey={String(currentSub)} triggerKey={String(currentSub)}>
                {renderSubStep()}
            </AnimatedContent>
          </div>
        </form>
      )}
    </WizardFormWrapperStep3>
  );
});

export default StepBudgetSavingsContainer;
