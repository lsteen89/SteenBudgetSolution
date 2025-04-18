import React, {
  useState,
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { FormProvider, FieldErrors, UseFormReturn } from "react-hook-form";
// Interfaces
import { ExpenditureFormValues } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/interface/ExpenditureFormValues";
// Wrapper for Step 2
import WizardFormWrapperStep2, {
  WizardFormWrapperStep2Ref,
} from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/Components/wrapper/WizardFormWrapperStep2";
// Sub-steps
import ExpenditureOverviewMainText from "./Pages/SubSteps/ExpenditureOverviewMainText";
import SubStepRent from "./Pages/SubSteps/2_SubStepRent/SubStepRent";
// Other pages
import LoadingScreen from "@components/molecules/feedback/LoadingScreen";
// Layout + Navigation
import WizardNavigationButtons from "@components/organisms/overlays/wizard/SharedComponents/WizardNavigationButtons";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import StepButton from "@components/molecules/buttons/StepButton";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import StepCarousel from "@components/molecules/progress/StepCarousel";
// Hooks
import useMediaQuery from "@hooks/useMediaQuery"; // For deciding mobile vs desktop
import { useSaveStepData } from "@hooks/wizard/useSaveStepData"; // Hook to save step data


// Icons
import {
  Info,
  Home,
  FileText,
  Utensils,
  Car,
  Shirt,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import SubStepFood from "./Pages/SubSteps/3_SubStepFood/SubStepFood";

//
// INTERFACES
//
export interface StepBudgetExpenditureContainerRef {
  validateFields: () => Promise<boolean>;
  getStepData: () => any;
  markAllTouched: () => void;
  getErrors: () => FieldErrors<ExpenditureFormValues>;
  getCurrentSubStep: () => number;
}

interface StepBudgetExpenditureContainerProps {
  // Passed from parent
  wizardSessionId: string;
  onSaveStepData: (stepNumber: number, subStepNumber: number, data: any) => Promise<boolean>;
  stepNumber: number;
  initialData?: any;               // Data loaded from DB for this step
  onNext: () => void;             // Called after substeps are done or on major "Next"
  onPrev: () => void;             // Called if user goes back a major step
  loading: boolean;               // Used to show spinner
  initialSubStep: number;          // 1-based sub-step index to start on
}

const StepBudgetExpenditureContainer = forwardRef<
  StepBudgetExpenditureContainerRef,
  StepBudgetExpenditureContainerProps
>((props, ref) => {

  const {
    wizardSessionId,
    onSaveStepData,
    stepNumber,
    initialData = {},
    onNext,
    onPrev,
    loading : parentLoading,
    initialSubStep,
  } = props;
  const isMobile = useMediaQuery("(max-width: 1367px)");

  const formWrapperRef = useRef<WizardFormWrapperStep2Ref>(null);

  useImperativeHandle(ref, () => ({
    validateFields: async () =>
      formMethods ? formMethods.trigger() : false,
    getStepData: () => (formMethods ? formMethods.getValues() : {}),
    markAllTouched: () => formMethods && formMethods.trigger(),
    getErrors: () => (formMethods ? formMethods.formState.errors : {}),
    getCurrentSubStep: () => currentSubStep,
  }));

  const [currentSubStep, setCurrentStep] = useState(initialSubStep || 1); // 1-based index
  const [formMethods, setFormMethods] = useState<
    UseFormReturn<ExpenditureFormValues> | null
  >(null);
  // Shake animation
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const triggerShakeAnimation = (duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  };


  // 4) Step List
  const steps = [
    { icon: Info, label: "Översikt" },
    { icon: Home, label: "Boende" },
    { icon: Utensils, label: "Matkostnader" },
    { icon: FileText, label: "Fasta utgifter" },
    { icon: Car, label: "Transport" },
    { icon: Shirt, label: "Kläder" },
    { icon: CreditCard, label: "Prenumerationer" },
    { icon: ShieldCheck, label: "Bekräfta" },
  ];
  const totalSteps = steps.length;

  // 5) Use Hook for Saving Step Data
  // Retrieve the methods object from the form wrapper (if available)

  const hasSetMethods = useRef(false);
  const handleFormWrapperRef = useCallback(
    (instance: WizardFormWrapperStep2Ref | null) => {
      if (instance && !hasSetMethods.current) {
        const newMethods = instance.getMethods();
        setFormMethods(newMethods);
        hasSetMethods.current = true;
      }
    },
    []
  );

  const { saveStepData } = useSaveStepData<ExpenditureFormValues>({
    stepNumber,
    methods: formMethods!, // Non-null assertion since we check for null above
    isMobile,
    onSaveStepData,
    setCurrentStep,
    triggerShakeAnimation,
  });


  if (parentLoading) {
    return <LoadingScreen />;
  }


  // 6) Next/Prev Step Handlers
  const saveAndGoNext = async () => {
    // Skip validation for sub-step #1 if it has no fields
    if (currentSubStep === 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    // If last sub-step, call the parent's onNext
    if (currentSubStep >= totalSteps) {
      onNext();
      return;
    }

    // Otherwise, normal partial save + move forward
    const stepLeaving = currentSubStep;
    const stepGoing = currentSubStep + 1;
    const success = await saveStepData(stepLeaving, stepGoing, false);
    if (!success) return;
  };

  const saveAndGoPrev = async () => {
    if (currentSubStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (isMobile) {
      setCurrentStep(totalSteps);
    } else {
      onPrev();
    }
  };

  // 7) Step Click for progress bar
  // Mobile carousel
  const handleCarouselClick = async (zeroBasedIndex: number) => {
    const stepGoing = zeroBasedIndex + 1;
    if (currentSubStep === 1) {
      setCurrentStep(stepGoing);
      return;
    }
    const success = await saveStepData(currentSubStep, stepGoing, false);
    if (!success) return;
  };

  // Desktop progress bar
  const handleProgressClick = async (destinationStep: number) => {
    // If user is on first step or going back, skip saving
    if (currentSubStep === 1 || destinationStep <= currentSubStep) {
      setCurrentStep(destinationStep);
      return;
    }
    console.log("Saving data for step", currentSubStep, "to", destinationStep);
    const success = await saveStepData(currentSubStep, destinationStep, false);
    if (!success) return;
  };

  // 8) Render Sub-Steps
  const renderSubStep = () => {
    switch (currentSubStep) {
      case 1:
        return <ExpenditureOverviewMainText />;
      case 2:
        return <SubStepRent />;
      case 3:
        return <SubStepFood />;
      default:
        return <div>All sub-steps complete!</div>;
    }
  };
  console.log("StepBudgetExpenditureContainer - initialData being passed:", initialData);
  // 9) Return
  return (
    <WizardFormWrapperStep2
        ref={(instance) => {
          handleFormWrapperRef(instance);
        }}
        initialData={initialData}
      >
      <form className="step-budget-expenditure-container flex flex-col h-full">
        {/* Heading + Step Navigation */}
        <div className="mb-6 flex items-center justify-between">
          {/* Mobile: left StepButton for previous */}
          {isMobile && <StepButton isLeft onClick={saveAndGoPrev} />}

          {/* Center: Step Progress or Carousel */}
          <div className="flex-1 text-center">
            {isMobile ? (
              <StepCarousel
                steps={steps}
                currentStep={currentSubStep - 1} // pass 0-based
                onStepClick={handleCarouselClick}
              />
            ) : (
              <WizardProgress
                step={currentSubStep} // pass 1-based
                totalSteps={totalSteps}
                steps={steps}
                adjustProgress={true}
                onStepClick={handleProgressClick}
              />
            )}
          </div>

          {/* Mobile: right StepButton for next */}
          {isMobile && <StepButton isLeft={false} onClick={saveAndGoNext} />}
        </div>

        {/* Render sub-step content */}
        <div className="flex-1">
          <AnimatedContent animationKey={currentSubStep}>
            {renderSubStep()}
          </AnimatedContent>
        </div>

        {/* Bottom Navigation for larger screens */}
        {!isMobile && (
          <div className="mt-4">
            <WizardNavigationButtons
              step={currentSubStep}
              prevStep={saveAndGoPrev}
              nextStep={saveAndGoNext}
              connectionError={false}
              initLoading={false}
              transitionLoading={false}
              isDebugMode={false}
              showShakeAnimation={showShakeAnimation}
            />
          </div>
        )}
      </form>
    </WizardFormWrapperStep2>
  );
});

export default StepBudgetExpenditureContainer;