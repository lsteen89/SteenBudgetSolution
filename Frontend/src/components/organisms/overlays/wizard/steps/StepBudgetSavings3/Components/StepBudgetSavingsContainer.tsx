import React, { useState, forwardRef, useImperativeHandle, useRef, useCallback, useEffect } from 'react'; 
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import WizardProgress from '@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';
import useMediaQuery from '@hooks/useMediaQuery';
import { Info, PiggyBank, Target, ShieldCheck } from 'lucide-react';
import SubStepIntro from './Pages/SubSteps/1_SubStepIntro/SubStepIntro';
import SubStepHabits from './Pages/SubSteps/2_SubStepHabits/SubStepHabits';
import SubStepGoals from './Pages/SubSteps/3_SubStepGoals/SubStepGoals';
import SubStepConfirm from './Pages/SubSteps/4_SubStepConfirm/SubStepConfirm';
import WizardFormWrapperStep3, { WizardFormWrapperStep3Ref } from './wrapper/WizardFormWrapperStep3';
import LoadingScreen from '@components/molecules/feedback/LoadingScreen';

export interface StepBudgetSavingsContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): any;
  markAllTouched(): void;
  getErrors(): any;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean;
}

interface StepBudgetSavingsContainerProps {
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
}

const StepBudgetSavingsContainer = forwardRef<StepBudgetSavingsContainerRef, StepBudgetSavingsContainerProps>((props, ref) => {
  const { onNext, onPrev, loading: parentLoading, initialSubStep, onSubStepChange } = props;
  const isMobile = useMediaQuery('(max-width: 1367px)');

  const [currentSub, setCurrentSub] = useState(initialSubStep || 1);
  const [skippedHabits, setSkippedHabits] = useState(false);

  const formWrapperRef = useRef<WizardFormWrapperStep3Ref>(null);

  const totalSteps = 4;

  const next = useCallback(() => {
    if (currentSub === 1) {
      const answer = formWrapperRef.current?.getMethods().getValues('savingHabit');
      const skip = answer === 'start' || answer === 'no';
      setSkippedHabits(skip);
      setCurrentSub(skip ? 3 : 2);
      return;
    }

    if (currentSub < totalSteps) {
      setCurrentSub(currentSub + 1);
    } else {
      onNext();
    }
  }, [currentSub, onNext, totalSteps]);


  const prev = useCallback(() => {
    if (currentSub === 3 && skippedHabits) {
      setCurrentSub(1);
      return;
    }
    if (currentSub > 1) {
      setCurrentSub(currentSub - 1);
    } else {
      onPrev();
    }
  }, [currentSub, onPrev, skippedHabits]);

  useEffect(() => {
    onSubStepChange?.(currentSub);
  }, [currentSub, onSubStepChange]);

  useImperativeHandle(ref, () => {
    const methods = formWrapperRef.current?.getMethods();
    return {
      validateFields: () => methods?.trigger() ?? Promise.resolve(false),
      getStepData: () => methods?.getValues() ?? {},
      markAllTouched: () => methods?.trigger(),
      getErrors: () => methods?.formState.errors ?? {},
      getCurrentSubStep: () => currentSub,
      goPrevSub: prev,
      goNextSub: next,
      hasPrevSub: () => (currentSub === 3 && skippedHabits) || currentSub > 1,
      hasNextSub: () => currentSub < totalSteps,
      isSaving: () => false,
      hasSubSteps: () => true,
    };
  }, [currentSub, prev, next, totalSteps, skippedHabits]);

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

  return (
    <WizardFormWrapperStep3 ref={formWrapperRef}>
      {parentLoading ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <LoadingScreen full textColor="black" />
        </div>
      ) : (
        <form className="flex flex-col h-full">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex-1 text-center">
              {isMobile ? (
                <StepCarousel steps={steps} currentStep={currentSub - 1} />
              ) : (
                <WizardProgress step={currentSub} totalSteps={totalSteps} steps={steps} adjustProgress onStepClick={setCurrentSub} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <AnimatedContent animationKey={currentSub}>{renderSubStep()}</AnimatedContent>
          </div>
        </form>
      )}
    </WizardFormWrapperStep3>
  );
});

export default StepBudgetSavingsContainer;