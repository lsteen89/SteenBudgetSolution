import React, { useState, forwardRef, useEffect } from 'react';
// Sub-steps
import ExpenditureOverviewMainText from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/ExpenditureOverviewMainText";
import SubStepRent from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepRent';
import SubStepUtilities from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepUtilities';
import SubStepFood from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepFood';
import SubStepTransport from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepTransport';
import SubStepClothing from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepClothing';
import SubStepSubscriptions from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepSubscriptions';
import SubStepConfirm from '@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/SubSteps/SubStepConfirm';
// Components
import WizardNavigationButtons from '@components/organisms/overlays/wizard/SharedComponents/WizardNavigationButtons';
import AnimatedContent from '@components/atoms/wrappers/AnimatedContent';
import StepButton from '@components/molecules/buttons/StepButton';

// Progress bars
import WizardProgress from '@components/organisms/overlays/wizard/layout/WizardProgress';
import StepCarousel from '@components/molecules/progress/StepCarousel';

// Icons
import { Info, Home, FileText, Utensils, Car, Shirt, CreditCard, ShieldCheck } from "lucide-react";
// hooks
import useMediaQuery from '@hooks/useMediaQuery';


/** Imperative handling for the parent */
export interface StepBudgetExpenditureContainerRef {
    validateFields: () => boolean;
    getStepData: () => any;
    markAllTouched: () => void;
    getErrors: () => { [key: string]: string };
  }

/** Props */
interface StepBudgetExpenditureContainerProps {
  initialData?: any;
  expenidtureInitialStep: number;
}

const StepBudgetExpenditureContainer = forwardRef<StepBudgetExpenditureContainerRef, StepBudgetExpenditureContainerProps   >(
    (
      {
        initialData = {},
        expenidtureInitialStep,
      },
      ref
    ) => {

  // Initialize wizard step from server data (if available)
  const [currentSubStep, setCurrentStep] = useState(0);

    // Total steps and Icons
    const totalSteps = 8;
    const steps = [
      { icon: Info, label: "Översikt" },
      { icon: Home, label: "Boende" },
      { icon: FileText, label: "Fasta utgifter" },
      { icon: Utensils, label: "Matkostnader" },
      { icon: Car, label: "Transport" },
      { icon: Shirt, label: "Kläder" },
      { icon: CreditCard, label: "Prenumerationer" },
      { icon: ShieldCheck, label: "Bekräfta" },
    ];
  // Handler for clicking an icon to navigate to a step
  const handleStepClick = (newIndex: number) => {
    setCurrentStep(newIndex);
  };
  // Todo: Replace with actual data
  const connectionError = false;
  const initLoading = false;
  const transitionLoading = false;
  const isDebugMode = false;
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);

  const prevSubStep = () => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  };

  const nextSubStep = () => {
    // Optionally, add validation logic here

    setCurrentStep((prev) => (prev + 1) % steps.length);
  };

  // Render the sub-step content
  const renderSubStep = () => {
    switch (currentSubStep) {
      case 0:
        return <ExpenditureOverviewMainText />;
      case 1:
        return <SubStepRent initialData={initialData.rent || {}} />;
      case 2:
        return <SubStepUtilities initialData={initialData.utilities || {}} />;
      case 3:
        return <SubStepFood initialData={initialData.food || {}} />;
      case 4:
        return <SubStepTransport initialData={initialData.transport || {}} />;
      case 5:
        return <SubStepClothing initialData={initialData.clothes || {}} />;
      case 6:
        return <SubStepSubscriptions initialData={initialData.subscriptions || {}} />;
      case 7:
        return <SubStepConfirm initialData={initialData.Confirm || {}} />;
      default:
        return <div>All sub-steps complete!</div>;
    }
  };

  // Media query for small screens
  const isMobile = useMediaQuery('(max-width: 1367px)');
  console.log("isMobile", isMobile);
  console.log("currentSubStep", currentSubStep);

  return (
    <div className="step-budget-expenditure-container flex flex-col h-full">
      {/* Heading and Step Progress with Side Navigation Buttons */}
      <div className="mb-6 flex items-center justify-between">
        {/* Previous Step Button on small screens only*/}
        {isMobile && <StepButton isLeft={true} onClick={prevSubStep} />}
  
        {/* Step Progress UI */}
        <div className="flex-1 text-center">
          {isMobile ? (
            <StepCarousel
              steps={steps}
              currentStep={currentSubStep}
              onStepClick={handleStepClick}
            />
          ) : (
            <WizardProgress
              step={currentSubStep}
              totalSteps={totalSteps}
              steps={steps}
              adjustProgress={true}
              onStepClick={handleStepClick}
            />
          )}
        </div>
  
        {/* Next Step Button on small screens only*/}
        {isMobile && <StepButton isLeft={false} onClick={nextSubStep} />}
      </div>
  
      {/* Animated sub-step content */}
      <div className="flex-1">
        <AnimatedContent animationKey={currentSubStep}>
          {renderSubStep()}
        </AnimatedContent>
      </div>
  
      {/* Navigation Buttons Fixed at the Bottom for larger screens only*/}
      {!isMobile && <div className="mt-4">
        <WizardNavigationButtons
          step={currentSubStep}
          prevStep={prevSubStep}
          nextStep={nextSubStep}
          connectionError={connectionError}
          initLoading={initLoading}
          transitionLoading={transitionLoading}
          isDebugMode={isDebugMode}
          showShakeAnimation={showShakeAnimation}
        />
      </div>}
    </div>
  );
});

export default StepBudgetExpenditureContainer;

