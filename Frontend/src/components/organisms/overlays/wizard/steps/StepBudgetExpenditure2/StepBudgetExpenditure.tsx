import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef } from 'react';

// Components
import GlassPane from "@components/layout/GlassPane";
import DataTransparencySection from "@components/organisms/overlays/wizard/SharedComponents/DataTransparencySection";
import StepBudgetExpenditureContainer from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/StepBudgetExpenditureContainer";
import AnimatedWrapper from '@components/atoms/wrappers/AnimatedContent';


/**  Imperative handle for the parent */
export interface StepBudgetExpenditureRef {
  validateFields: () => boolean;
  getStepData: () => any;
  markAllTouched: () => void;
  getErrors: () => { [key: string]: string };
}

/**  Props */
interface StepBudgetExpenditureProps  {
  setStepValid: (isValid: boolean) => void;
  wizardSessionId: string;
  onSaveStepData: (stepNumber: number, data: any) => Promise<boolean>;
  stepNumber: number;
  initialData: any;
  onNext: () => void;
  onPrev: () => void;
  loading: boolean;
  expenidtureInitialStep: number;
}

/**  Form Values Interface */
interface FormValues {
  dummyExpenditure?: number | null;
}

const StepBudgetExpenditure = forwardRef<StepBudgetExpenditureRef, StepBudgetExpenditureProps  >(
  (
    {
      setStepValid,
      wizardSessionId,
      onSaveStepData,
      stepNumber,
      initialData,
      onNext,
      onPrev,
      loading,
      expenidtureInitialStep,
    },
    ref
  ) => {
    // Define initial form values; since fields aren’t ready, we use a dummy value
    const initialValues: FormValues = {
      dummyExpenditure: initialData?.dummyExpenditure ?? null,
    };
    // Expose imperative methods if needed
    useImperativeHandle(ref, () => ({
      validateFields: () => {
        // Validate entire step logic
        return true;
      },
      getStepData: () => {
        // Aggregate data from subpages
        return {};
      },
      markAllTouched: () => {},
      getErrors: () => {
        return {};
      },
    }));
  // 1. Refs to child steps
  const StepBudgetIncomeRef = useRef<StepBudgetExpenditureRef>(null);
  // Initialize wizard step from server data (if available)
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (expenidtureInitialStep > 0) {
      setStep(expenidtureInitialStep);
    }
  }, [expenidtureInitialStep]);

  const [isStepValid, setIsStepValid] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const isDebugMode = process.env.NODE_ENV === 'development';
  return (
    <GlassPane>

      {/* Main container */}
      <StepBudgetExpenditureContainer 
        ref={StepBudgetIncomeRef}
        initialData={initialData} 
        expenidtureInitialStep={expenidtureInitialStep}
      />
      {/* Data Transparency Section */}
      <DataTransparencySection />
      {/* NAVIGATION BUTTONS (BOTTOM) */}

    </GlassPane>
    );
  }
);

export default StepBudgetExpenditure;

