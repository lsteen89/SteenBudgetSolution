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
import { Loader2 } from "lucide-react";
// Layout + Navigation
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
import StepButton from "@components/molecules/buttons/StepButton";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import StepCarousel from "@components/molecules/progress/StepCarousel";
import WizardNavPair from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair";
// Hooks
import useMediaQuery from "@hooks/useMediaQuery"; // For deciding mobile vs desktop
import { useSaveStepData } from "@hooks/wizard/useSaveStepData"; // Hook to save step data
import GhostIconButton from "@components/atoms/buttons/GhostIconButton";

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
import { useToast } from "@context/ToastContext";
// (Line removed)

//
// INTERFACES
//
export interface StepBudgetExpenditureContainerRef {
  validateFields(): Promise<boolean>;
  getStepData(): any;
  markAllTouched(): void;
  getErrors(): FieldErrors<ExpenditureFormValues>;
  /** current (1-based) sub-step inside this major step */
  getCurrentSubStep(): number;
  /** step-local navigation helpers */
  goPrevSub(): void;
  goNextSub(): void;
  hasPrevSub(): boolean;
  hasNextSub(): boolean;
  isSaving(): boolean;
}

interface StepBudgetExpenditureContainerProps {
  // Passed from parent
  wizardSessionId: string;
  onSaveStepData: (stepNumber: number, subStepNumber: number, data: any, goingBackwards: boolean) => Promise<boolean>;
  stepNumber: number;
  initialData?: any;               // Data loaded from DB for this step
  onNext: () => void;             // Called after substeps are done or on major "Next"
  onPrev: () => void;             // Called if user goes back a major step
  loading: boolean;               // Used to show spinner
  initialSubStep: number;          // 1-based sub-step index to start on
  onSubStepChange?: (newSub: number) => void; // Optional callback for sub-step changes (used in setupwizard for mobile buttons)
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

  const isDebugMode = process.env.NODE_ENV === 'development';
  
  // This state is used to show a loading spinner when saving data
  // and to disable the buttons, thus preventing double-clicks or similar
  const [isSaving, setIsSaving] = useState(false);

  
  const [currentSubStep, setCurrentStep] = useState(initialSubStep || 1); // 1-based index
  const [formMethods, setFormMethods] = useState<
    UseFormReturn<ExpenditureFormValues> | null
  >(null);

  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const triggerShakeAnimation = (duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  };

  const { showToast } = useToast();

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
  });

  /* ───────────────────────────────
    6. Next / Prev button handlers
    ──────────────────────────────*/

  /** Unified jump helper – used by every navigation method */
  const goToSubStep = async (destination: number) => {
    /* 1 — Dev-mode fast-jump (never call API) */
    // REMOVE THIS LINE FOR PRODUCTION
    /*
    if (isDebugMode) { // REMOVE THIS LINE FOR PRODUCTION
      setCurrentStep(destination);
      return;
    }
    */
    /* 2 — Figure out direction + whether we may skip validation */
    const goingBackwards     = destination < currentSubStep;
    const skipValidationFlag = currentSubStep === 1 || goingBackwards;

    /* 3 — Overlay + lock UI */
    setIsSaving(true);
    console.log("Rent data:", formMethods?.getValues("rent"));
    console.log("error", formMethods?.formState.errors);

      try {
        const ok = await saveStepData(
          currentSubStep,
          destination,
          skipValidationFlag,
          goingBackwards
        );
        if (!ok) {
          // 🚨 API save failed → show toast, but *still* navigate forward
          showToast(
            "🚨 Kunde inte spara dina ändringar. Fortsätter ändå…",
            "error"
          );
          triggerShakeAnimation(1000);
          return;
        }
    
        // 4 — In either case, go to the destination sub-step
        setCurrentStep(destination);
      } finally {
        // 5 — Always remove the overlay
        setIsSaving(false);
      }
    };

  /* “Next” button */
  const saveAndGoNext = () => {
    /* A. FIRST sub-step – always just show the next page */
    if (currentSubStep === 1) {
      setCurrentStep(prev => prev + 1);
      return;
    }

    /* B. LAST sub-step – what happens depends on viewport */
    if (currentSubStep === totalSteps) {
      if (isMobile) {
        goToSubStep(1);         // carousel: wrap around
      } else {
        onNext();               // desktop: jump to next major step
      }
      return;
    }

    /* C. Normal “next” inside the range */
    goToSubStep(currentSubStep + 1);
  };

  /* “Prev” button */
  const saveAndGoPrev = () => {
    /* A. FIRST sub-step – wrap or delegate to parent */
    if (currentSubStep === 1) {
      if (isMobile) {
        goToSubStep(totalSteps);   // carousel: wrap to last
      } else {
        onPrev();                  // desktop: previous major step
      }
      return;
    }

    /* B. Normal back */
    goToSubStep(currentSubStep - 1);
  };

  /* ───────────────────────────────
    7. Click handlers for progress / carousel
    ──────────────────────────────*/

  const handleCarouselClick = (zeroBased: number) => {
    goToSubStep(zeroBased + 1);    // 0-based → 1-based
  };

  const handleProgressClick = (destination: number) => {
    goToSubStep(destination);      // already 1-based
  };

  // Ping the current sub-step to the parent component
  useEffect(() => {
    props.onSubStepChange?.(currentSubStep);   // fires after every move
  }, [currentSubStep]);

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
  useImperativeHandle(ref, () => ({
    validateFields: async () =>
      formMethods ? formMethods.trigger() : false,
    getStepData: () => (formMethods ? formMethods.getValues() : {}),
    markAllTouched: () => formMethods && formMethods.trigger(),
    getErrors: () => (formMethods ? formMethods.formState.errors : {}),
    getCurrentSubStep: () => currentSubStep,
    goPrevSub: saveAndGoPrev,
    goNextSub: saveAndGoNext,
    hasPrevSub: () => currentSubStep > 1,
    hasNextSub: () => currentSubStep < totalSteps,
    isSaving: () => isSaving,
  }));
  // 9) Return
  return (
    <WizardFormWrapperStep2
        key="expenditure-major-step-2"
        ref={(instance) => {
          handleFormWrapperRef(instance);
        }}
        initialData={initialData}
        currentSubStep={currentSubStep}
      >
        
      {parentLoading ? (
        <LoadingScreen />
        // TODO: Load screen also on child components (e.g. SubStepRent)
      ) : (
      <form className="step-budget-expenditure-container flex flex-col h-full">
        {/* Heading + Step Navigation */}
        <div className="mb-6 flex items-center justify-between">
          {isSaving && (
            <div className="absolute inset-0 z-50 flex items-center justify-center
                            bg-white/60 backdrop-blur-sm">
              <Loader2 size={32} className="animate-spin text-darkLimeGreen" />
            </div>
          )}
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
          <div className="my-6 w-full flex items-center justify-between">
            <WizardNavPair
                step={currentSubStep}
                prevStep={saveAndGoPrev}
                nextStep={saveAndGoNext}
                hasPrev={currentSubStep > 1}
                hasNext={currentSubStep < totalSteps}
                connectionError={false}
                initLoading={false}
                transitionLoading={false}
                isDebugMode={false}
                showShakeAnimation={showShakeAnimation}
                isMajor={false} // Use sub-step navigation (</>)
                isSaving={isSaving}
            />           
          </div>
        )}
      </form>
      )}
    </WizardFormWrapperStep2>
  );
});

export default StepBudgetExpenditureContainer;