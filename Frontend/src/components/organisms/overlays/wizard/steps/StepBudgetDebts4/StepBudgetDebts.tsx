import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import GlassPane from '@components/layout/GlassPane';
import DataTransparencySection from '@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection';
import StepBudgetDebtsContainer, { StepBudgetDebtsContainerRef } from './Components/StepBudgetDebtsContainer';
import { Step4FormValues } from '@/types/Wizard/Step4FormValues';
import { ensureStep4Defaults } from '@/utils/wizard/ensureStep4Defaults';
import { StepBudgetDebtsRef } from '@/types/Wizard/StepBudgetDebtsRef';

interface StepBudgetDebtsProps {
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

const StepBudgetDebts = forwardRef<StepBudgetDebtsRef, StepBudgetDebtsProps>((props, ref) => {
  const containerRef = useRef<StepBudgetDebtsContainerRef>(null);

  useImperativeHandle(ref, () => ({
    validateFields: async () => (await containerRef.current?.validateFields()) ?? false,
    getStepData: () => containerRef.current?.getStepData() ?? ensureStep4Defaults({}),
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
       <StepBudgetDebtsContainer
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

export default StepBudgetDebts;
