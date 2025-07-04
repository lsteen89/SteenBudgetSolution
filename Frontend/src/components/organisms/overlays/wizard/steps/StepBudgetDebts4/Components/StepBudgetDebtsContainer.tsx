import React, { useState, forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import { Step4FormValues } from '@/types/Wizard/Step4FormValues';
import { ensureStep4Defaults } from '@/utils/wizard/ensureStep4Defaults';
import { useSaveStepData } from '@hooks/wizard/useSaveStepData';
import { useWizardDataStore } from '@/stores/Wizard/wizardDataStore';
import useMediaQuery from '@hooks/useMediaQuery';
import WizardProgress from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import WizardFormWrapperStep4, { WizardFormWrapperStep4Ref } from './wrapper/WizardFormWrapperStep4';
import { Info, CreditCard, ShieldCheck } from 'lucide-react';
import GatekeeperPage from './Pages/SubSteps/1_SubStepGatekeeper/SubStepGatekeeper';
import SkulderPage from './Pages/SubSteps/2_SubStepDebts/SubStepDebts';
import ConfirmPage from './Pages/SubSteps/3_SubStepConfirm/SubStepConfirm';

export interface StepBudgetDebtsContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): Step4FormValues;
  markAllTouched(): void;
  getErrors(): FieldErrors<Step4FormValues>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
  getTotalSubSteps: () => number;
}

interface StepBudgetDebtsContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step4FormValues>;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

function getDebtsPartialData(subStep: number, allData: Step4FormValues): Partial<Step4FormValues> {
  switch (subStep) {
    case 1:
      return { intro: allData.intro };
    case 2:
      return { debts: allData.debts };
    case 3:
      return { summary: allData.summary };
    default:
      return {};
  }
}

const StepBudgetDebtsContainer = forwardRef<StepBudgetDebtsContainerRef, StepBudgetDebtsContainerProps>((props, ref) => {
  const {
    onSaveStepData,
    stepNumber,
    initialData = {},
    onNext,
    onPrev,
    loading: parentLoading,
    initialSubStep,
    onSubStepChange,     
    onValidationError,    
  } = props;
  const isMobile = useMediaQuery('(max-width: 1367px)');
  const hasHydrated = useRef(false);

  const { setDebts } = useWizardDataStore();
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0 && !hasHydrated.current) {
      const complete = ensureStep4Defaults(initialData);
      setDebts(complete);
      hasHydrated.current = true;
    }
  }, [initialData, setDebts]);

  const formWrapperRef = useRef<WizardFormWrapperStep4Ref>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [skippedDebts, setSkippedDebts] = useState(false);
  const [formMethods, setFormMethods] = useState<UseFormReturn<Step4FormValues> | null>(null);
  const [isFormHydrated, setIsFormHydrated] = useState(false);

  const handleFormHydration = () => setIsFormHydrated(true);

  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback((instance: WizardFormWrapperStep4Ref | null) => {
    if (instance && !hasSetMethods.current) {
      setFormMethods(instance.getMethods());
      hasSetMethods.current = true;
    }
  }, []);

  const { saveStepData } = useSaveStepData<Step4FormValues>({
    stepNumber,
    methods: formMethods ?? undefined,
    isMobile,
    onSaveStepData,
    setCurrentStep: setCurrentSub,
    onError: () => props.onValidationError?.(),
    getPartialDataForSubstep: getDebtsPartialData,
  });

  const totalSteps = 3;

  const goToSub = async (dest: number) => {
    const goingBack = dest < currentSub;
    const skipValidation = goingBack;
    setIsSaving(true);
    const ok = await saveStepData(currentSub, dest, skipValidation, goingBack);
    setIsSaving(false);
    if (ok) setCurrentSub(dest);
  };

  const next = async () => {
    if (currentSub === 1) {
      const answer = formMethods?.getValues('intro.hasDebts');
      const hasDebts = answer === true 
      if (!hasDebts) {
        setDebts({ debts: [] });
        setSkippedDebts(true);
        await goToSub(3);
        return;
      }
      await goToSub(2);
      return;
    }

    if (currentSub < totalSteps) {
      await goToSub(currentSub + 1);
    } else {
      onNext();
    }
  };

  const prev = () => {
    let destinationSub = currentSub - 1;
    if (currentSub === 3 && skippedDebts) {
      destinationSub = 1;
    }

    if (destinationSub >= 1) {
      goToSub(destinationSub);
    } else {
      onPrev();
    }
  };

  const clickProgress = (d: number) => goToSub(d);

  useEffect(() => {
    if (isFormHydrated) onSubStepChange?.(currentSub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSub, isFormHydrated]);

  useImperativeHandle(ref, () => ({
    validateFields: () => formMethods?.trigger() ?? Promise.resolve(false),
    getStepData: () => {
      const allData = formMethods?.getValues() ?? ensureStep4Defaults({});
      // Instead of all data, return only the data from the final substep.
      return {
        summary: allData.summary,
      };
    },
    markAllTouched: () => formMethods?.trigger(),
    getErrors: () => formMethods?.formState.errors ?? {},
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => (currentSub === 3 && skippedDebts) || currentSub > 1,
    hasNextSub: () => currentSub < totalSteps,
    isSaving: () => isSaving,
    hasSubSteps: () => true,
    getTotalSubSteps: () => totalSteps,
  }));

  const steps = [
    { icon: Info, label: 'Intro' },
    { icon: CreditCard, label: 'Skulder' },
    { icon: ShieldCheck, label: 'Bekräfta' },
  ];

  const renderSubStep = () => {
    switch (currentSub) {
      case 1: return <GatekeeperPage />;
      case 2: return <SkulderPage />;
      case 3: return <ConfirmPage />;
      default: return <div>All sub-steps complete!</div>;
    }
  };

  return (
    <WizardFormWrapperStep4
      ref={handleFormWrapperRef}
      onHydrationComplete={handleFormHydration}
    >
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
                <StepCarousel steps={steps} currentStep={currentSub - 1} />
              ) : (
                <WizardProgress step={currentSub} totalSteps={totalSteps} steps={steps} adjustProgress onStepClick={clickProgress} />
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
    </WizardFormWrapperStep4>
  );
});

export default StepBudgetDebtsContainer;
