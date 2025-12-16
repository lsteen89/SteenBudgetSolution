import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import GlassPane from '@components/layout/GlassPane';
import DataTransparencySection from '@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection';
import StepBudgetFinalContainer, { StepBudgetFinalContainerRef } from './Components/StepBudgetFinalContainer';
import { Step5FormValues } from '@/types/Wizard/Step5FormValues';
import { StepBudgetFinalRef } from '@/types/Wizard/StepBudgetFinalRef';
import { Skeleton } from '@/components/ui/Skeleton';

interface StepBudgetFinalProps {
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

const StepBudgetFinal = forwardRef<StepBudgetFinalRef, StepBudgetFinalProps>((props, ref) => {
  const containerRef = useRef<StepBudgetFinalContainerRef>(null);

  useImperativeHandle(ref, () => ({
    validateFields: async () => (await containerRef.current?.validateFields()) ?? true,
    getStepData: () => containerRef.current?.getStepData() ?? {},
    markAllTouched: () => containerRef.current?.markAllTouched(),
    getErrors: () => containerRef.current?.getErrors() ?? {},
    getCurrentSubStep: () => containerRef.current?.getCurrentSubStep() ?? 0,
    goPrevSub: () => containerRef.current?.goPrevSub?.(),
    goNextSub: () => containerRef.current?.goNextSub?.(),
    hasPrevSub: () => containerRef.current?.hasPrevSub?.() ?? false,
    hasNextSub: () => containerRef.current?.hasNextSub?.() ?? false,
    isSaving: () => containerRef.current?.isSaving?.() ?? false,
    hasSubSteps: () => containerRef.current?.hasSubSteps?.() ?? false,
  }), []);

  const isBusy = props.loading || props.isFinalizing;

  return (
    <GlassPane className="relative">
      {isBusy && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-white/60 backdrop-blur-sm">
          <Skeleton className="h-10 w-40" />
        </div>
      )}

      {/* Optional: prevent interactions + visually dim underneath */}
      <div className={isBusy ? "pointer-events-none opacity-40" : ""}>
        <StepBudgetFinalContainer
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
          finalizeWizard={props.finalizeWizard}
          isFinalizing={props.isFinalizing}
          finalizationError={props.finalizationError}
          onFinalizeSuccess={props.onFinalizeSuccess}
        />
        <DataTransparencySection />
      </div>
    </GlassPane>
  );
});

export default StepBudgetFinal;
