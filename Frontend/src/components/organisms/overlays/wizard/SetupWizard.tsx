import React, { useState, useEffect, useRef, ReactNode } from "react";
import ReactDOM from "react-dom";
import { flushSync } from 'react-dom';
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

// Wizard-related API calls
import { startWizard, saveWizardStep, getWizardData } from "@api/Services/wizard/wizardService";
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

// Step configuration for icons & labels
const steps = [
  { icon: Wallet, label: "Inkomster" },
  { icon: CreditCard, label: "Utgifter" },
  { icon: User, label: "Sparande" },
  { icon: CheckCircle, label: "Bekräfta" },
];

interface SetupWizardProps {
  onClose: () => void;
}

interface FormValues {
  showSideIncome: boolean;
  showHouseholdMembers: boolean;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {

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
  } = useWizardInit();

  const { handleSaveStepData, isSaving, saveError } = useSaveWizardStep(wizardSessionId || '', (data) => {});


  // loading state
  const [transitionLoading, setTransitionLoading] = useState(false);

  // 4. Step & validation
  const [step, setStep] = useState<number>(0);
  const totalSteps = steps.length;
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



  // State for showing side income and household members
  const setShowSideIncome = (value: boolean) => {
    setValues(prev => {
      return { ...prev, showSideIncome: value };
    });
  };
  const setShowHouseholdMembers = (value: boolean) => {
    setValues(prev => {
      return { ...prev, showHouseholdMembers: value };
    });
  };

  const [values, setValues] = useState<FormValues>({ showSideIncome: false, showHouseholdMembers: false });
  
  // 6. Next / Previous Step Logic
  const nextStep = async () => {
    setTransitionLoading(true);
    // Validate step
    const isStepValid = await handleStepValidation(step, stepRefs, setValues);
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
        if (!saveSuccess) {
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

          {/* Heading logic */}
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            {step === 0 ? (
              <>
                Välkommen till{" "}
                <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
                  eBudget
                </span>
              </>
            ) : step === 1 ? (
              <>
                Steg 1: Vad har du för{" "}
                <span className="font-semibold text-blue-600"> inkomster</span>
              </>
            ) : step === 2 ? (
              "Steg 2: Utgifter"
            ) : step === 3 ? (
              "Steg 3: Sparande"
            ) : step === 4 ? (
              "Steg 4: Bekräfta"
            ) : (
              "Setup Wizard"
            )}
          </h2>

          {/* Progress Indicator */}
          <div className="relative flex items-center justify-between mb-6">
            {/* Background line */}
            <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
              <motion.div
                className="h-full bg-darkLimeGreen"
                initial={{ width: "0%" }}
                animate={{ width: step > 0 ? `${(step / totalSteps) * 100}%` : "0%" }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {steps.map((item, index) => (
              <div
                key={index}
                className="relative z-10 flex flex-col items-center w-1/4"
              >
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                    step > index
                      ? "bg-darkLimeGreen text-white"
                      : step === index
                      ? "bg-gray-300 text-gray-700"
                      : "bg-gray-300 text-gray-700"
                  }`}
                >
                  <item.icon size={20} />
                </div>
                <span className="mt-2 text-sm font-medium text-gray-800">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* STEP CONTENT */}
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="mb-6 text-center text-gray-700 
                h-[60vh] 
                md:h-[70vh]
                lg:h-auto
                overflow-y-auto
              "
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
                      wizardSessionId ? (
                        <StepBudgetInfo
                          ref={stepBudgetInfoRef}
                          setStepValid={setIsStepValid}
                          wizardSessionId={wizardSessionId}
                          onSaveStepData={handleSaveStepData}
                          stepNumber={1}
                          initialData={wizardData[1]}
                          onNext={() => {}}
                          onPrev={() => {}}
                          showSideIncome={values.showSideIncome}
                          setShowSideIncome={setShowSideIncome}
                          showHouseholdMembers={values.showHouseholdMembers}
                          setShowHouseholdMembers={setShowHouseholdMembers}
                          loading={transitionLoading || initLoading}
                        />
                      ) : (
                        <p>Error: No wizard session available.</p>
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
