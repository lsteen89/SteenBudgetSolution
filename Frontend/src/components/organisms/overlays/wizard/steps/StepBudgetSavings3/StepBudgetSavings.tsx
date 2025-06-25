import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import GlassPane from '@components/layout/GlassPane';
import DataTransparencySection from '@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection';
import StepBudgetSavingsContainer, { StepBudgetSavingsContainerRef } from './Components/StepBudgetSavingsContainer';
import { Step3FormValues } from '@/schemas/wizard/StepSavings/step3Schema';

export interface StepBudgetSavingsRef {
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

interface StepBudgetSavingsProps {
  wizardSessionId: string;
  onSaveStepData: (
    step: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialData?: Partial<Step3FormValues>;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
  onValidationError?: () => void;
}

const StepBudgetSavings = forwardRef<StepBudgetSavingsRef, StepBudgetSavingsProps>((props, ref) => {
  const containerRef = useRef<StepBudgetSavingsContainerRef>(null);

  useImperativeHandle(ref, () => ({
    validateFields: async () => (await containerRef.current?.validateFields()) ?? false,
    getStepData: () => containerRef.current?.getStepData() ?? {},
    markAllTouched: () => containerRef.current?.markAllTouched(),
    getErrors: () => containerRef.current?.getErrors() ?? {},
    getCurrentSubStep: () => containerRef.current?.getCurrentSubStep() ?? 0,
    goPrevSub: () => containerRef.current?.goPrevSub?.(),
    goNextSub: () => containerRef.current?.goNextSub?.(),
    hasPrevSub: () => containerRef.current?.hasPrevSub?.() ?? false,
    hasNextSub: () => containerRef.current?.hasNextSub?.() ?? false,
    isSaving: () => containerRef.current?.isSaving?.() ?? false,
    hasSubSteps: () => true,
  }), []);

  return (
    <div>
      <GlassPane>
       <StepBudgetSavingsContainer
          ref={containerRef}
          wizardSessionId={props.wizardSessionId}
          onSaveStepData={props.onSaveStepData}
          stepNumber={props.stepNumber}
          initialData={props.initialData}
          onNext={props.onNext}
          onPrev={props.onPrev}
          loading={props.loading}
          initialSubStep={props.initialSubStep}
          onSubStepChange={props.onSubStepChange}
          onValidationError={props.onValidationError}
        />
        <DataTransparencySection />
      </GlassPane>
    </div>
  );
});

export default StepBudgetSavings;
