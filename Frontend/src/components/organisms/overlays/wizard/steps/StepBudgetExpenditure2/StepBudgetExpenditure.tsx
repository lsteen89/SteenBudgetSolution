import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { FieldErrors } from "react-hook-form";

import GlassPane from "@components/layout/GlassPane";
import DataTransparencySection from "@components/organisms/overlays/wizard/SharedComponents/Pages/DataTransparencySection";
import StepBudgetExpenditureContainer, {
  StepBudgetExpenditureContainerRef,
} from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/StepBudgetExpenditureContainer";

export interface StepBudgetExpenditureRef {
  validateFields: () => Promise<boolean>;
  getStepData: () => any;
  markAllTouched: () => void;
  getErrors: () => FieldErrors<any>;
}

interface StepBudgetExpenditureProps {
  setStepValid: (isValid: boolean) => void;
  wizardSessionId: string;
  onSaveStepData: (stepNumber: number, subStep: number, data: any) => Promise<boolean>;
  stepNumber: number;
  initialSubStep: number; // the sub-step index we start on
  initialData: any;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
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
  }));
  const containerKey = "step-budget-expenditure-container";
  return (
    <div key={containerKey}>
      <GlassPane>
        <StepBudgetExpenditureContainer
          ref={containerRef}
          initialData={props.initialData}
          wizardSessionId={props.wizardSessionId}
          onSaveStepData={(stepNumber, subStepNumber, data) =>
            props.onSaveStepData(stepNumber, subStepNumber, data)
          }
          stepNumber={props.stepNumber}
          initialSubStep={props.initialSubStep}
          onNext={props.onNext}
          onPrev={props.onPrev}
          loading={props.loading}
        />
        <DataTransparencySection />
        {/* If you have extra navigation buttons for the user, place them here */}
      </GlassPane>
    </div>
  );
});

export default StepBudgetExpenditure;
