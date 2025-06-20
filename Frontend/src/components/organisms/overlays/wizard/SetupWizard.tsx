import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Wallet,
  User,
  CheckCircle,
  CreditCard,
} from "lucide-react";

// Container for wizard step content (styling)
import WizardStepContainer from "@components/molecules/containers/WizardStepContainer";
// Individual step components
import StepWelcome from "@components/organisms/overlays/wizard/steps/StepWelcome";
// Importing step components
// INITIAL STEPS
import StepBudgetSavings, { StepBudgetSavingsRef } from "@components/organisms/overlays/wizard/steps/StepBudgetSavings3/StepBudgetSavings";
import StepConfirmation from "@components/organisms/overlays/wizard/steps/StepConfirmation";
// Step 1: Income 
import WizardFormWrapperStep1, { WizardFormWrapperStep1Ref } from '@components/organisms/overlays/wizard/steps/StepBudgetIncome1/wrapper/WizardFormWrapperStep1'; 
import StepBudgetIncome from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/StepBudgetIncome";
// Step 2: Expenditure
import StepExpenditure, { StepBudgetExpenditureRef } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure";

// Toast notification
import { useToast } from "@context/ToastContext";
// hooks
import useSaveWizardStep from "@hooks/wizard/useSaveWizardStep";
import useWizardInit from "@hooks/wizard/useWizardInit";
import useMediaQuery from "@hooks/useMediaQuery";
import useWizardNavigation from "@hooks/wizard/useWizardNavigation";
// removed per-form hooks; wrappers will handle scrolling to errors
//local display state
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
// Header import
import WizardHeading from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardHeading";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
// Footer import
import WizardNavPair from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair";
// Modal import
import ConfirmModal from "@components/atoms/modals/ConfirmModal";
// Stores

// ---------------------------- TYPES ----------------------------
interface SetupWizardProps {
  onClose: () => void;
}

interface FormValues {
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
}

// ---------------------------- COMPONENT ----------------------------
const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {

  // Handler for clicking an icon to navigate to a step
  const handleStepClick = (targetStep: number) => {
    setStep(targetStep);
  };


  // 1. Wizard closure
  // State for the confirmation modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  // 1A. Opens the modal for user confirmation
  const handleWizardClose = useCallback(() => {
    setConfirmModalOpen(true); // Open the confirmation modal
  }, [setConfirmModalOpen]);

  //1.1A. Handle closing of the wizard without saving
  const handleConfirmCloseWizard = useCallback(() => {
    setConfirmModalOpen(false); // Close the modal
    onClose(); // Call the parent's onClose callback to close the wizard
  }, [onClose, setConfirmModalOpen]);

  //1.2B. Handle canceling the closure of the wizard
  const handleCancelCloseWizard = useCallback(() => {
    setConfirmModalOpen(false); // Close the modal, wizard stays open
  }, [setConfirmModalOpen]);

  // 2. Styles and toast
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const { showToast } = useToast();
  // Helper function to trigger shake animation
  const triggerShakeAnimation = (duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  };
  // States:
  // 3A. State for wizard data, session
  const {
    loading: initLoading,
    wizardSessionId,
    wizardData,
    setWizardData,
    failedAttempts,
    connectionError,
    initWizard,
    initialStep,
    initialSubStep,
  } = useWizardInit();
  // 3B. Handler for saving step data
  const { handleSaveStepData } = useSaveWizardStep(wizardSessionId || '');
  // 3C. loading state
  const [transitionLoading, setTransitionLoading] = useState(false);

  // 3D. State for saving current substep for each step
  const [currentStepState, setCurrentStepState] = useState<Record<number, any>>({});
  const initialDataForStep = (stepNumber: number) => {
    return currentStepState[stepNumber]?.data || wizardData[stepNumber] || {};
  };
  // 3E. Initial substep for each step
  const initialSubStepForStep = (stepNumber: number) => {
    return (currentStepState[stepNumber]?.subStep || initialSubStep) ?? 1;
  };

  // 4. Step & validation
  // Initialize wizard step from server data (if available)
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (initialStep > 0) {
      setStep(initialStep);
    }
  }, [initialStep]);
  // Total steps and step data

  const totalSteps = 4;
  const steps = [
    { icon: Wallet, label: "Inkomster" },
    { icon: CreditCard, label: "Utgifter" },
    { icon: User, label: "Sparande" },
    { icon: CheckCircle, label: "Bekräfta" },
  ];
  const [isStepValid, setIsStepValid] = useState(true);
  const isDebugMode = process.env.NODE_ENV === 'development';

  // 5. Refs to child steps
  const step1WrapperRef = useRef<WizardFormWrapperStep1Ref>(null);
  const StepBudgetExpenditureRef = useRef<StepBudgetExpenditureRef>(null);
  const step3Ref = useRef<StepBudgetSavingsRef>(null);

  // Refs for all steps
  const stepRefs: { [key: number]: React.RefObject<any> } = {
    1: step1WrapperRef,
    2: StepBudgetExpenditureRef,
    3: step3Ref,
  };

  // State for local state
  const { flags, setShowSideIncome, setShowHouseholdMembers } = useBudgetInfoDisplayFlags();
  const [subTick, setSubTick] = useState(0);
  const handleSubStepChange = useCallback(() => {
    setSubTick(t => t + 1);
  }, []);

  // 6. Handle step navigation
  // Call the useWizardNavigation hook
  const { nextStep: hookNextStep, prevStep: hookPrevStep } =
  useWizardNavigation({
    step,
    setStep,
    totalSteps,
    stepRefs,
    setTransitionLoading,
    setCurrentStepState,
    handleSaveStepData,
    setWizardData,
    triggerShakeAnimation,
    isDebugMode,
    setShowSideIncome,
    setShowHouseholdMembers,
  });

  //    Otherwise, default to "not valid" until validated
  useEffect(() => {
    if (step === 0) {
      setIsStepValid(true);
    } else {
      setIsStepValid(false);
    }
  }, [step]);

  // Scroll to top whenever the major or sub step changes
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, subTick]);

    /* -----------------------------------------------------------
    7. Ask the active child step (if any) for its sub-nav API
    ------------------------------------------------------------*/
  // State for the active step API
  const [activeStepAPI, setActiveStepAPI] = useState<any>(null);
  // 2. Use EFFECT to watch the ref and update the state when the ref is ready.
  useEffect(() => {
    // This code runs AFTER every render.
    const currentRefAPI = stepRefs[step]?.current;

    // If the ref is populated and its value is different from what's in our state...
    if (currentRefAPI !== activeStepAPI) {
      // ...update the state! This will trigger a new, corrected render.
      setActiveStepAPI(currentRefAPI);
    }
    
    // This effect depends on the step and the ref's current value.
  }, [step, stepRefs[step]?.current, activeStepAPI]);
  const subNav = useMemo(() => {
  const api = activeStepAPI; // Read from the reliable state variable.

  // Use the hasSubSteps function for a more explicit check!
  if (api && typeof api.hasSubSteps === "function" && api.hasSubSteps()) {
    return {
      prevSub: api.goPrevSub,
      nextSub: api.goNextSub,
      hasPrevSub: typeof api.hasPrevSub === 'function' ? api.hasPrevSub() : false,
      hasNextSub: typeof api.hasNextSub === 'function' ? api.hasNextSub() : false,
    };
  }

  // Default return value
  return {
    prevSub: () => {},
    nextSub: () => {},
    hasPrevSub: false,
    hasNextSub: false,
  };
}, [activeStepAPI, subTick]); // Now only depends on state.

const isSaving = useMemo(() => {
    // This logic also reads from the reliable state variable.
    return activeStepAPI && typeof activeStepAPI.isSaving === 'function'
      ? activeStepAPI.isSaving()
      : false;
}, [activeStepAPI]);


  // media query for small screens
  const isMobile = useMediaQuery('(max-width: 1367px)');
  console.log("Current step:", step, "Sub-tick:", subTick, "Is mobile:", isMobile, "Has sub-steps:", subNav.hasNextSub, subNav.hasPrevSub);  
  // ---------------------------- RENDER ----------------------------
  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto w-full h-full ">
      <div className="flex items-center justify-center bg-black bg-opacity-50 min-h-screen py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-standardMenuColor bg-opacity-40 backdrop-blur-lg p-6 rounded-2xl shadow-xl w-11/12 relative"
        >
          {/* Close Button (top-right corner) */}
          <button
            type="button"
            onClick={handleWizardClose}
            title="Close Wizard"
            className="absolute top-3 right-3 text-red-600 hover:text-red-800"
          >
            <X size={24} />
          </button>
          <WizardHeading step={step} type="wizard" />
          <WizardProgress
            step={step}
            totalSteps={totalSteps}
            steps={steps}
            onStepClick={handleStepClick}
          />
          <AnimatedContent ref={containerRef} animationKey={step} className="mb-6 text-center text-gray-700 h-[60vh] md:h-[70vh] lg:h-auto overflow-y-auto">
            <WizardStepContainer
              disableDefaultWidth={step === 2} // disable default for step 2
              className={
                step === 2
                  ? isMobile
                    ? "max-w-lg"   // normal width on mobile
                    : "max-w-4xl" // bigger width on larger screens
                  : ""
              }
            >

              {step === 0 ? (
                // Step 0: Welcome
                <StepWelcome
                  connectionError={connectionError}
                  failedAttempts={failedAttempts}
                  loading={transitionLoading || initLoading}
                  onRetry={initWizard}
                />
              ) : (
                <>
                  {step === 1 && (
                    (wizardSessionId || isDebugMode) ? (
                      <WizardFormWrapperStep1
                        ref={step1WrapperRef}


                      >
                        <StepBudgetIncome
                          onNext={() => hookNextStep()} // Use the hook's nextStep
                          onPrev={() => hookPrevStep()} // Use the hook's prevStep 
                          loading={transitionLoading || initLoading}
                          stepNumber={1} 
                        />
                      </WizardFormWrapperStep1>
                    ) : (
                      <p>Tekniskt fel!</p>
                    )
                  )}
                  {step === 2 && <StepExpenditure
                    ref={StepBudgetExpenditureRef}
                    setStepValid={setIsStepValid}
                    wizardSessionId={wizardSessionId || ''}
                    onSaveStepData={handleSaveStepData}
                    stepNumber={2}
                    initialData={initialDataForStep(2)} // Use derived state for initial data
                    onNext={() => hookNextStep()} // Use the hook's nextStep
                    onPrev={() => hookPrevStep()} // Use the hook's prevStep
                    loading={transitionLoading || initLoading}
                    initialSubStep={initialSubStepForStep(2)} // Use derived state
                    onSubStepChange={handleSubStepChange}
                  />}
                  {step === 3 && (
                    <StepBudgetSavings
                        ref={step3Ref}
                        onNext={() => hookNextStep()}
                        onPrev={() => hookPrevStep()}
                        loading={transitionLoading || initLoading}
                        initialSubStep={initialSubStepForStep(3)}
                        onSubStepChange={handleSubStepChange}
                        wizardSessionId={wizardSessionId || ''}
                        onSaveStepData={handleSaveStepData}
                        stepNumber={3}
                        initialData={initialDataForStep(3)}
                    />
                  )}
                  {step === 4 && <StepConfirmation />}
                </>
              )}

            </WizardStepContainer>

          </AnimatedContent>

          <div className="w-full max-w-4xl mx-auto">
            <div className="my-6 w-full flex items-center justify-between">
              <WizardNavPair
                step={step}
                prevStep={subNav.hasPrevSub ? subNav.prevSub : hookPrevStep}
                nextStep={subNav.hasNextSub ? subNav.nextSub : hookNextStep}
                hasPrev={subNav.hasPrevSub || step > 0}
                hasNext={subNav.hasNextSub || step < totalSteps}

                hasPrevSub={subNav.hasPrevSub}
                hasNextSub={subNav.hasNextSub}

                connectionError={connectionError}
                initLoading={initLoading}
                transitionLoading={transitionLoading}
                isDebugMode={isDebugMode}
                showShakeAnimation={showShakeAnimation}
                isSaving={isSaving}
              />
            </div>
          </div>
        </motion.div>
      </div>
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title="Är du säker?"
        description="Om du väljer att avsluta nu så sparas den data du angett i nuvarande form inte"
        onCancel={handleCancelCloseWizard} // Close modal, wizard stays open
        onConfirm={handleConfirmCloseWizard} // Close modal, then close wizard via onClose prop
      />
    </div>
  );
};

export default SetupWizard;
