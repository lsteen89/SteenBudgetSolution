import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { FieldErrors } from "react-hook-form";

import GlassPane from "@components/layout/GlassPane";
import DataTransparencySection from "@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection";
import StepBudgetExpenditureContainer, {
  StepBudgetExpenditureContainerRef,
} from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/StepBudgetExpenditureContainer";
import type { Step2FormValues }       from '@/schemas/wizard/step2Schema';

export interface StepBudgetExpenditureRef {
  validateFields(): Promise<boolean>;
  getStepData(): any;
  markAllTouched(): void;
  getErrors(): FieldErrors<any>;
  getCurrentSubStep(): number;
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
  hasSubSteps: () => boolean; 
}

interface StepBudgetExpenditureProps {
  setStepValid: (isValid: boolean) => void;
  wizardSessionId: string;
  onSaveStepData: (
    stepNumber: number,
    subStep: number,
    data: any,
    goingBackwards: boolean
  ) => Promise<boolean>;
  stepNumber: number;
  initialSubStep: number;
  initialData: Partial<Step2FormValues>;   
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  onSubStepChange?: (newSub: number) => void;
}

const StepBudgetExpenditure = forwardRef<
  StepBudgetExpenditureRef,
  StepBudgetExpenditureProps
>((props, ref) => {
  // We'll store a ref to the container so we can call its imperative methods
  const containerRef = useRef<StepBudgetExpenditureContainerRef>(null);

  // Expose container’s methods up the chain
  useImperativeHandle(ref, () => ({
    validateFields: async () => {
      return (await containerRef.current?.validateFields()) ?? false;
    },
    getStepData: () => {
      return containerRef.current?.getStepData() ?? {};
    },
    markAllTouched: () => {
      containerRef.current?.markAllTouched();
    },
    getErrors: () => {
      return containerRef.current?.getErrors() ?? {};
    },
    getCurrentSubStep: () => {
      return containerRef.current?.getCurrentSubStep() ?? 0;
    },
    goPrevSub: () => containerRef.current?.goPrevSub?.(),
    goNextSub: () => containerRef.current?.goNextSub?.(),
    hasPrevSub: () => containerRef.current?.hasPrevSub?.() ?? false,
    hasNextSub: () => containerRef.current?.hasNextSub?.() ?? false,
    isSaving: () => containerRef.current?.isSaving?.() ?? false,
    hasSubSteps: () => true,
  }));
  const containerKey = "step-budget-expenditure-container";
  const getCurrentSubStep = () => {
    return containerRef.current?.getCurrentSubStep() ?? 0;
  }
  return (
    <div key={containerKey}>
      <GlassPane>
        <StepBudgetExpenditureContainer
          ref={containerRef}
          initialData={props.initialData}
          wizardSessionId={props.wizardSessionId}
          onSaveStepData={(stepNumber, subStepNumber, data, goingBackwards) =>
            props.onSaveStepData(stepNumber, subStepNumber, data, goingBackwards)
          }
          stepNumber={props.stepNumber}
          initialSubStep={props.initialSubStep}
          onNext={props.onNext}
          onPrev={props.onPrev}
          loading={props.loading}
          onSubStepChange={props.onSubStepChange}
        />
        <DataTransparencySection />
        {/* If you have extra navigation buttons for the user, place them here */}
      </GlassPane>
    </div>
  );
});

export default StepBudgetExpenditure;
