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
import StepPreferences from "@components/organisms/overlays/wizard/steps/StepPreferences";
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
//local display state
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
// Header import
import WizardHeading from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardHeading";
import WizardProgress from "@components/organisms/overlays/wizard/SharedComponents/Menu/WizardProgress";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
// Footer import
import WizardNavPair from "@components/organisms/overlays/wizard/SharedComponents/Buttons/WizardNavPair";
import WizardNavigationFooter from "@components/organisms/overlays/wizard/SharedComponents/Wrappers/WizardNavigationFooter";
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
  const { handleSaveStepData } = useSaveWizardStep(wizardSessionId || '', setWizardData);
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
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const isDebugMode = process.env.NODE_ENV === 'development';

  // 5. Refs to child steps
  const step1WrapperRef = useRef<WizardFormWrapperStep1Ref>(null);
  const StepBudgetExpenditureRef = useRef<StepBudgetExpenditureRef>(null);

  // Refs for all steps
  const stepRefs: { [key: number]: React.RefObject<any> } = {
    1: step1WrapperRef,
    2: StepBudgetExpenditureRef,
    //3: stepExpenditureRef,
    //4: stepConfirmationRef,
  };

  // State for local state
  const { flags, setShowSideIncome, setShowHouseholdMembers } = useBudgetInfoDisplayFlags();
  const [subTick, setSubTick] = useState(0);

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

  const [activeStepRef, setActiveStepRef] = useState<any | null>(null);

  useEffect(() => {
    const refObject = stepRefs[step];
    if (refObject && refObject.current !== activeStepRef) {
      setActiveStepRef(refObject.current);
    }
  }, [step, stepRefs[step]]);

    /* -----------------------------------------------------------
    7. Ask the active child step (if any) for its sub-nav API
    ------------------------------------------------------------*/
    const subNav = useMemo(() => {
      const api = stepRefs[step]?.current;
    
      if (api && typeof api.goPrevSub === "function") {
        return {
          prevSub: api.goPrevSub,
          nextSub: api.goNextSub,
          hasPrevSub: api.hasPrevSub(),
          hasNextSub: api.hasNextSub(),
        };
      }
      return {
        prevSub: () => {},
        nextSub: () => {},
        hasPrevSub: false,
        hasNextSub: false,
      };
    }, [step, stepRefs[step], subTick]);  
    const activeStepAPI = stepRefs[step]?.current;

    const saving = activeStepAPI && "isSaving" in activeStepAPI
      ? activeStepAPI.isSaving()
      : false;

  // media query for small screens
  const isMobile = useMediaQuery('(max-width: 1367px)');

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
          <AnimatedContent animationKey={step} className="mb-6 text-center text-gray-700 h-[60vh] md:h-[70vh] lg:h-auto overflow-y-auto">
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
                    onSubStepChange={() => setSubTick(t => t + 1)} // Force re-render on sub-step change
                  />}
                  {step === 3 && <StepPreferences />}
                  {step === 4 && <StepConfirmation />}
                </>
              )}

            </WizardStepContainer>

          </AnimatedContent>

          {/* NAVIGATION BUTTONS (BOTTOM) */}
          {isMobile ? (
            <footer className="fixed bottom-0 inset-x-0 p-4 bg-white/30 rounded-xl backdrop-blur-lg shadow-lg">
              <WizardNavigationFooter
                /* major */
                prevMajor={hookPrevStep}
                nextMajor={hookNextStep}
                hasPrevMajor={step > 0}
                hasNextMajor={step < totalSteps}
                /* sub  */
                prevSub={subNav.prevSub}
                nextSub={subNav.nextSub}
                hasPrevSub={subNav.hasPrevSub}
                hasNextSub={subNav.hasNextSub}
                /* shared flags */
                connectionError={connectionError}
                initLoading={initLoading}
                transitionLoading={transitionLoading}
                isDebugMode={isDebugMode}
                showShakeAnimation={showShakeAnimation}
                isSaving={saving}
                step={step}
              />
            </footer>
            ) : (
            /* desktop */
            <div className="my-6 w-full flex items-center justify-between">
              <WizardNavPair
                step={step}
                prevStep={hookPrevStep}
                nextStep={hookNextStep}
                hasPrev={step > 0}
                hasNext={step < totalSteps}
                connectionError={connectionError}
                initLoading={initLoading}
                transitionLoading={transitionLoading}
                isDebugMode={isDebugMode}
                showShakeAnimation={showShakeAnimation}
                isSaving={saving}
                isMajor
              />
            </div>
          )}
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