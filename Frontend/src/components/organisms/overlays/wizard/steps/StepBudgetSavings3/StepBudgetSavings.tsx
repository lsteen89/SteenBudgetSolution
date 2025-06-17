import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import GlassPane from '@components/layout/GlassPane';
import DataTransparencySection from '@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection';
import StepBudgetSavingsContainer, { StepBudgetSavingsContainerRef } from './Components/StepBudgetSavingsContainer';

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
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  initialSubStep: number;
  onSubStepChange?: (newSub: number) => void;
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
  }));

  return (
    <div>
      <GlassPane>
        <StepBudgetSavingsContainer
          ref={containerRef}
          onNext={props.onNext}
          onPrev={props.onPrev}
          loading={props.loading}
          initialSubStep={props.initialSubStep}
          onSubStepChange={props.onSubStepChange}
        />
        <DataTransparencySection />
      </GlassPane>
    </div>
  );
});

export default StepBudgetSavings;
