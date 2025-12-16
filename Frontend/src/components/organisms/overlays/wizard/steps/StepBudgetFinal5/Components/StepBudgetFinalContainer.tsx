import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { FieldErrors } from 'react-hook-form';
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import WizardFormWrapperStep5, { WizardFormWrapperStep5Ref } from './wrapper/WizardFormWrapperStep5';
import useMediaQuery from '@hooks/useMediaQuery';
import { Step5FormValues } from '@/types/Wizard/Step5FormValues';
import { StepBudgetFinalRef } from '@/types/Wizard/StepBudgetFinalRef';
import WizardProgress from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';
import SubStepFinal from './Pages/SubSteps/1_SubStepFinal/SubStepFinal';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldCheck } from 'lucide-react';

export interface StepBudgetFinalContainerRef extends StepBudgetFinalRef {
  markAllTouched(): void;
  getErrors(): FieldErrors<Step5FormValues>;
  hasSubSteps: () => boolean;
  getTotalSubSteps: () => number;
}

interface StepBudgetFinalContainerProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step5FormValues>;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
  finalizeWizard: () => Promise<boolean>;
  isFinalizing: boolean;
  finalizationError: string | null;
  onFinalizeSuccess: () => void;
}

const StepBudgetFinalContainer = forwardRef<StepBudgetFinalContainerRef, StepBudgetFinalContainerProps>((props, ref) => {
  const { onNext, onPrev, loading: parentLoading, initialSubStep } = props;
  const isMobile = useMediaQuery('(max-width: 1367px)');
  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const wrapperRef = useRef<WizardFormWrapperStep5Ref>(null);

  const steps = [{ label: 'Slut', icon: ShieldCheck }];
  const totalSteps = 1;

  const next = () => {
    if (currentSub < totalSteps) {
      setCurrentSub(currentSub + 1);
      props.onSubStepChange?.(currentSub + 1);
    } else {
      onNext();
    }
  };

  const prev = () => {
    if (currentSub > 1) {
      setCurrentSub(currentSub - 1);
      props.onSubStepChange?.(currentSub - 1);
    } else {
      onPrev();
    }
  };

  useImperativeHandle(ref, () => ({
    validateFields: async () => true,
    getStepData: () => ({} as Step5FormValues),
    markAllTouched: () => { },
    getErrors: () => ({} as FieldErrors<Step5FormValues>),
    getCurrentSubStep: () => currentSub,
    goPrevSub: prev,
    goNextSub: next,
    hasPrevSub: () => false,
    hasNextSub: () => false,
    isSaving: () => false,
    hasSubSteps: () => false,
    getTotalSubSteps: () => totalSteps,
  }), [currentSub, next, prev]);

  const renderSubStep = () => (
    <SubStepFinal
      onFinalize={props.finalizeWizard}
      isFinalizing={props.isFinalizing}
      finalizationError={props.finalizationError}
      onFinalizeSuccess={props.onFinalizeSuccess}
    />
  );

  return (
    <WizardFormWrapperStep5 ref={wrapperRef}>

      <form className="flex flex-col h-full">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex-1 text-center">
            {isMobile ? (
              <StepCarousel steps={steps} currentStep={0} />
            ) : (
              <WizardProgress
                step={1}
                totalSteps={1}
                steps={steps}
                onStepClick={() => { }}
              />
            )}
          </div>
        </div>
        <div className="flex-1">
          <AnimatedContent animationKey="1" triggerKey="1">
            {renderSubStep()}
          </AnimatedContent>
        </div>
      </form>

    </WizardFormWrapperStep5>
  );
});

export default StepBudgetFinalContainer;
