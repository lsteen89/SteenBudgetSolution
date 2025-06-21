import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';


import { Step3FormValues } from '@/schemas/wizard/StepSavings/step3Schema';
import { ensureStep3Defaults } from '@/utils/wizard/ensureStep3Defaults';
import { useSaveStepData } from '@hooks/wizard/useSaveStepData';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import useMediaQuery from '@hooks/useMediaQuery';

import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
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
}

function getSavingsPartialData(
  subStep: number,
  allData: Step3FormValues
): Partial<Step3FormValues> {
  switch (subStep) {
    case 1: return { savingHabit: allData.savingHabit };
    case 2: return { monthlySavings: allData.monthlySavings, savingMethods: allData.savingMethods };
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

  /* 1 ─── Hydrate slice once --------------------------------------- */
  const { setSavings } = useWizardDataStore();
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      // Use the defaults utility to create a complete and type-safe object.
      // This resolves all type inconsistencies at once.
      const completeData = ensureStep3Defaults(initialData);
      
      // Pass the perfectly typed data to the store.
      setSavings(completeData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

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
    // onError can be added here if shake animations are desired
    // --- (B) Pass the NEW slicing function as a prop to the hook ---
    getPartialDataForSubstep: getSavingsPartialData,
  });

  /* 4 ─── navigation helpers --------------------------------------- */
  const totalSteps = 4;

  const goToSub = async (dest: number, skipValidation = false) => {
    const goingBack = dest < currentSub;
    setIsSaving(true);
    await saveStepData(currentSub, dest, skipValidation || goingBack, goingBack);
    setIsSaving(false);
  };

  const next = async () => {
    // Logic for skipping habit step
    if (currentSub === 1) {
      const answer = formMethods?.getValues('savingHabit');
      const skip = answer === 'start' || answer === 'no';
      setSkippedHabits(skip);
      // The Intro step requires no validation, just save and proceed
      await goToSub(skip ? 3 : 2, true);
      return;
    }

    if (currentSub < totalSteps) {
      await goToSub(currentSub + 1);
    } else {
      // On the final sub-step, validate and save before calling parent onNext
      const isValid = await formMethods?.trigger();
      if (isValid) {
        await goToSub(currentSub, true); // Save final step data
        onNext();
      }
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
    onSubStepChange?.(currentSub);
  }, [currentSub, onSubStepChange]);

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
            <AnimatedContent animationKey={currentSub}>
              {renderSubStep()}
            </AnimatedContent>
          </div>
        </form>
      )}
    </WizardFormWrapperStep3>
  );
});

export default StepBudgetSavingsContainer;