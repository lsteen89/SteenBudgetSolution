import React, { useState, useEffect, useRef, ReactNode } from "react";
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
import StepBudgetIncome, { StepBudgetIncomeRef } from "@components/organisms/overlays/wizard/steps/StepBudgetIncome1/StepBudgetIncome";
import StepExpenditure, { StepBudgetExpenditureRef } from "@components/organisms/overlays/wizard/steps/StepBudgetExpenditure2/StepBudgetExpenditure";
import StepPreferences from "@components/organisms/overlays/wizard/steps/StepPreferences";
import StepConfirmation from "@components/organisms/overlays/wizard/steps/StepConfirmation";
// Navigation buttons
import WizardNavigationButtons from "@components/organisms/overlays/wizard/SharedComponents/WizardNavigationButtons";
// Toast notification
import { useToast } from  "@context/ToastContext";
// Step validation
import { handleStepValidation  } from "@components/organisms/overlays/wizard/validation/handleStepValidation";
// hooks
import useSaveWizardStep from "@hooks/wizard/useSaveWizardStep";
import useWizardInit from "@hooks/wizard/useWizardInit";
import useMediaQuery from "@hooks/useMediaQuery";
//local display state
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
// Header import
import WizardHeading from "@components/organisms/overlays/wizard/layout/WizardHeading";
import WizardProgress from "@components/organisms/overlays/wizard/layout/WizardProgress";
import AnimatedContent from "@components/atoms/wrappers/AnimatedContent";
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

  // 1. Handling wizard closure
  const handleWizardClose = () => {
    onClose(); // parent's callback
  };

  // 2. Styles and toast 
  const [showShakeAnimation, setShowShakeAnimation] = useState(false);
  const { showToast } = useToast();
  // Helper function to trigger shake animation
  const triggerShakeAnimation = (duration = 1000) => {
    setShowShakeAnimation(true);
    setTimeout(() => setShowShakeAnimation(false), duration);
  };
  // 3. State for wizard data, session
  const {
    loading: initLoading,
    wizardSessionId,
    wizardData,
    failedAttempts,
    connectionError,
    initWizard,
    initialStep,
  } = useWizardInit();

  const { handleSaveStepData, isSaving, saveError } = useSaveWizardStep(wizardSessionId || '', (data) => {});

  // loading state
  const [transitionLoading, setTransitionLoading] = useState(false);

  // 4. Step & validation
  // Initialize wizard step from server data (if available)
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (initialStep > 0) {
      setStep(initialStep);
    }
  }, [initialStep]);
  // Total steps and step data
  const expenidtureInitialStep = 0;
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
  const StepBudgetIncomeRef = useRef<StepBudgetIncomeRef>(null);
  const StepBudgetExpenditureRef = useRef<StepBudgetExpenditureRef>(null);
  
  // Refs for all steps 
  const stepRefs: { [key: number]: React.RefObject<any> } = {
    1: StepBudgetIncomeRef,
    2: StepBudgetExpenditureRef,
    //3: stepExpenditureRef,
    //4: stepConfirmationRef,
  };

  // State for local state
  const { flags, setShowSideIncome, setShowHouseholdMembers } = useBudgetInfoDisplayFlags();

  // 6. Next / Previous Step Logic
  const nextStep = async () => {
    setTransitionLoading(true);
    // Validate step
    const isStepValid = await handleStepValidation(step, stepRefs, setShowSideIncome, setShowHouseholdMembers);
    // If step is not valid, show shake animation
    if (!isStepValid) {
      triggerShakeAnimation();
      setTransitionLoading(false);
      return;
    }

    // Save data
    const stepRef = stepRefs[step];
    if (stepRef?.current) {
      const data = stepRef.current.getStepData();
      if (data) {
        const saveSuccess = await handleSaveStepData(step, data);
        if (!saveSuccess && !isDebugMode) {
          setTransitionLoading(false);
          showToast("🚨 Ett fel uppstod – försök igen eller kontakta support.", "error");
          return;
        }
      }
    }
    // Move to next step
    setStep((prev) => Math.min(prev + 1, totalSteps));
    setTransitionLoading(false);
  };

  // 7. Previous Step Logic
  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };
  //    Otherwise, default to "not valid" until validated
  useEffect(() => {
    if (step === 0) {
      setIsStepValid(true);
    } else {
      setIsStepValid(false);
    }
  }, [step]);

  // media query for small screens
  const isMobile = useMediaQuery('(max-width: 1367px)');


console.log("Debug Mode:", isDebugMode);
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
                className={
                  step === 2
                    ? isMobile
                      ? "max-w-lg"  // normal width on mobile
                      : "max-w-5xl" // bigger width on larger screens
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
                        <StepBudgetIncome
                          ref={StepBudgetIncomeRef}
                          setStepValid={setIsStepValid}
                          wizardSessionId={wizardSessionId || ''}
                          onSaveStepData={handleSaveStepData}
                          stepNumber={1}
                          initialData={wizardData[1]}
                          onNext={() => {}}
                          onPrev={() => {}}
                          showSideIncome={flags.showSideIncome}
                          setShowSideIncome={setShowSideIncome}
                          showHouseholdMembers={flags.showHouseholdMembers}
                          setShowHouseholdMembers={setShowHouseholdMembers}
                          loading={transitionLoading || initLoading}
                        />
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
                      initialData={wizardData[2]}
                      onNext={() => {}}
                      onPrev={() => {}}
                      loading={transitionLoading || initLoading}
                      expenidtureInitialStep={expenidtureInitialStep}
                    
                    />}
                    {step === 3 && <StepPreferences />}
                    {step === 4 && <StepConfirmation />}
                  </>
                )}
                
              </WizardStepContainer>

            </AnimatedContent>

          {/* NAVIGATION BUTTONS (BOTTOM) */}
          <WizardNavigationButtons
          step={step}
          prevStep={prevStep}
          nextStep={nextStep}
          connectionError={connectionError}
          initLoading={initLoading}
          transitionLoading={transitionLoading}
          isDebugMode={isDebugMode}
          showShakeAnimation={showShakeAnimation}
        />
        </motion.div>
      </div>
    </div>
  );
};

export default SetupWizard;
