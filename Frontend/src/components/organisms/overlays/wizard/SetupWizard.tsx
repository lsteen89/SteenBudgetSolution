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
import StepBudgetInfo, { StepBudgetInfoRef } from "@components/organisms/overlays/wizard/steps/StepBudgetInfo";
import StepExpenditure, { StepExpenditureRef } from "@components/organisms/overlays/wizard/steps/StepExpenditure";
import StepPreferences from "@components/organisms/overlays/wizard/steps/StepPreferences";
import StepConfirmation from "@components/organisms/overlays/wizard/steps/StepConfirmation";
// css
import styles from "./SetupWizard.module.css";
// Toast notification
import { useToast } from  "@context/ToastContext";
// Step validation
import { handleStepValidation  } from "@components/organisms/overlays/wizard/validation/handleStepValidation";
// hooks
import useSaveWizardStep from "@hooks/wizard/useSaveWizardStep";
import useWizardInit from "@hooks/wizard/useWizardInit";
//local display state
import useBudgetInfoDisplayFlags from "@hooks/wizard/flagHooks/useBudgetInfoDisplayFlags";
// Header import
import WizardHeading from "@components/organisms/overlays/wizard/layout/WizardHeading";
import WizardProgress from "@components/organisms/overlays/wizard/layout/WizardProgress";

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
  const stepBudgetInfoRef = useRef<StepBudgetInfoRef>(null);
  //const stepExpenditureRef = useRef<StepExpenditureRef>(null);
  
  // Refs for all steps 
  const stepRefs: { [key: number]: React.RefObject<any> } = {
    1: stepBudgetInfoRef,
    //2: stepPreferencesRef,
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


console.log("Debug Mode:", isDebugMode);
  // ---------------------------- RENDER ----------------------------
  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto w-full h-full">
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

          <WizardHeading step={step} />
            <WizardProgress
            step={step}
            totalSteps={totalSteps}
            steps={steps}
            onStepClick={handleStepClick}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="mb-6 text-center text-gray-700 h-[60vh] md:h-[70vh] lg:h-auto overflow-y-auto"
            >
              <WizardStepContainer>
                
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
                        <StepBudgetInfo
                          ref={stepBudgetInfoRef}
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
                    {step === 2 && <StepPreferences />}
                    {step === 3 && <StepPreferences />}
                    {step === 4 && <StepConfirmation />}
                  </>
                )}
                
              </WizardStepContainer>
            </motion.div>
          </AnimatePresence>

          {/* NAVIGATION BUTTONS (BOTTOM) */}
          <div className="flex justify-between">
            {step > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 flex items-center gap-1 bg-limeGreen text-gray-700 rounded-lg hover:bg-customBlue2 transition"
              >
                <ChevronLeft size={18} />
                Tillbaka
              </button>
            )}
            {/* Next Button with Toast Integration */}
              <button
                type="button"
                onClick={() => {nextStep();}}
                disabled={!isDebugMode && (connectionError || initLoading || transitionLoading)}
                className={`px-4 py-2 flex items-center gap-1 text-gray-700 rounded-lg transition ml-auto 
                  bg-limeGreen 
                  ${connectionError || initLoading || transitionLoading ? "opacity-50 cursor-not-allowed" : "hover:bg-darkLimeGreen hover:text-white"} 
                  ${showShakeAnimation ? styles["animate-shake"] : ""}`}
              >
              {step === 0 ? "Start" : "Nästa"}
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SetupWizard;
