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
  Settings,
} from "lucide-react";

// Wizard-related API calls
import { startWizard, saveWizardStep, getWizardData } from "@api/Services/wizard/wizardService";
import { StartWizardResponse } from "@api/Services/wizard/wizardService";
// Container for wizard step content (styling)
import WizardStepContainer from "@components/molecules/containers/WizardStepContainer";

// Individual step components
import StepWelcome from "./steps/StepWelcome";
import StepBudgetInfo, { StepBudgetInfoRef } from "./steps/StepBudgetInfo";
import StepPersonalInfo from "./steps/StepPersonalInfo";
import StepPreferences from "./steps/StepPreferences";
import StepConfirmation from "./steps/StepConfirmation";

// css
import styles from "./SetupWizard.module.css";

// Toast notification
import { useToast } from  "@context/ToastContext";
// Step configuration for icons & labels
const steps = [
  { icon: Wallet, label: "Inkomster" },
  { icon: User, label: "Sparande" },
  { icon: Settings, label: "Utgifter" },
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
  const [wizardData, setWizardData] = useState<any>({});
  const [wizardSessionId, setWizardSessionId] = useState<string>("");
  // State for failed attempts to start wizard
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(false);

  // loading state
  const [loading, setLoading] = useState(true);

  // 4. Step & validation
  const [step, setStep] = useState<number>(0);
  const totalSteps = steps.length;
  const [isStepValid, setIsStepValid] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const isDebugMode = process.env.NODE_ENV === 'development';

  // 5. Refs to child steps
  const stepBudgetInfoRef = useRef<StepBudgetInfoRef>(null);

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

  // If you need other steps to manage their own state & validation,
  // create refs for them as well (e.g. stepPersonalInfoRef, etc.)

  const [values, setValues] = useState<FormValues>({ showSideIncome: false, showHouseholdMembers: false });
  // 6. Next / Previous Step Logic
  const nextStep = async () => {
    // Example check for Step 1: StepBudgetInfo
    if (step === 1) {
      // Mark all fields as touched so that validation errors are displayed
      stepBudgetInfoRef.current?.markAllTouched();
      // 1) Validate the child
      const isValid = stepBudgetInfoRef.current?.validateFields();

      // Retrieve errors from the child using getErrors helper
      const allErrors = stepBudgetInfoRef.current?.getErrors() || {};
      const sideHustleErrorKeys = Object.keys(allErrors).filter(
        (key) => key.startsWith("sideHustle") || key.startsWith("frequency")
      );

      if (sideHustleErrorKeys.length > 0) {
        flushSync(() => {
          setShowSideIncome(true);
        });
      }

      // do same for household members
      const householdMemberErrorKeys = Object.keys(allErrors).filter(
        (key) => key.startsWith("memberName") || key.startsWith("memberIncome") || key.startsWith("memberFrequency")
      );
      if (householdMemberErrorKeys.length > 0) {
        flushSync(() => {
          setShowHouseholdMembers(true);
        });
      }

      if (!isValid) {
        setIsStepValid(false);

        // Show shake effect & toast
        setShowShakeAnimation(true);
        setTimeout(() => setShowShakeAnimation(false), 500);
        showToast(
          <>
            🚨 Du måste fylla i alla <strong>obligatoriska fält</strong> innan du kan fortsätta.
          </>,
          "error"
        );
          return;
        }

      // 2) If valid, gather the child's data
      const data = stepBudgetInfoRef.current?.getStepData();
      if (data) {
        // 3) Save partial data to backend
        await handleSaveStepData(step, data);
      }
    }

    // If not on Step 1, or after Step 1 is validated/saved, go to next
    setStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 0));
  };

  // 7. Partial save function
  const handleSaveStepData = async (stepNumber: number, data: any) => {
    try {
      console.log("Saving step data:", stepNumber, data);
      await saveWizardStep(wizardSessionId, stepNumber, data);
      // Merge partial data into local wizardData
      setWizardData((prev: any) => ({
        ...prev,
        [stepNumber]: data,
      }));
      setIsStepValid(true); // Mark step as valid after successful save
    } catch (error) {
      console.error("Error saving wizard step:", error);
    }
  };

  // 8. On mount, start (or resume) the wizard
  const initWizard = async () => {
    setLoading(true);
    try {
      const { wizardSessionId, message }: StartWizardResponse = await startWizard();
      console.log("startWizard response:", { wizardSessionId, message });
      if (!wizardSessionId) {
        setConnectionError(true);
        setFailedAttempts(prev => {
          const newAttempts = prev + 1;
          console.log("No session ID. New failedAttempts:", newAttempts);
          if (newAttempts >= 3) {

            setTimeout(() => {
              showToast(
                <>
                  🚨 Anslutningsproblem <br /> vänligen kontakta support.
                </>,
                "error"
              );
            }, 0);
          } else {
            setTimeout(() => {
              showToast(
                <>
                  🚨 Ingen anslutning <br /> <strong>Ingen data kan sparas eller hämtas</strong>
                </>,
                "error"
              );
            }, 0);
          }
          return newAttempts;
        });
        return;
      }
      // Successful connection:
      setFailedAttempts(0);
      setConnectionError(false);
      setWizardSessionId(wizardSessionId);
      console.log("Wizard session started:", wizardSessionId);
      const existingData = await getWizardData(wizardSessionId);
      setWizardData(existingData || {});
      // If reconnecting after previous failures, give positive feedback:
      if (failedAttempts > 0) {
        showToast(
          <>✅ Återanslutning lyckades.</>,
          "success"
        );
      }
    } catch (error) {
      setConnectionError(true);
      console.error("Error in initWizard:", error);
      setFailedAttempts(prev => {
        const newAttempts = prev + 1;
        console.log("Error branch. New failedAttempts:", newAttempts);
        if (newAttempts >= 3) {
          setConnectionError(true);
          setTimeout(() => {
            showToast(
              <>
                🚨 Anslutningsproblem <br /> vänligen kontakta support eller försök igen
              </>,
              "error"
            );
          }, 0);
        } else {
          setTimeout(() => {
            showToast(
              <>
                🚨 Ingen anslutning <br /> <strong>Ingen data kan sparas eller hämtas</strong>
              </>,
              "error"
            );
          }, 0);
        }
        return newAttempts;
      });
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  useEffect(() => {
    initWizard();
  }, []);


  // 9. If on step 0 (Welcome), always allow "Next"
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
              "Steg 2: Sparande"
            ) : step === 3 ? (
              "Steg 3: Utgifter"
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
                    loading={loading}
                    onRetry={initWizard}
                  />
                ) : (
                  <>
                    {step === 1 && (
                      <StepBudgetInfo
                        ref={stepBudgetInfoRef}
                        setStepValid={setIsStepValid}
                        wizardSessionId={wizardSessionId}
                        onSaveStepData={handleSaveStepData}
                        stepNumber={1}
                        initialData={wizardData[1]}
                        onNext={() => {}} // not used
                        onPrev={() => {}} // not used
                        showSideIncome={values.showSideIncome} 
                        setShowSideIncome={setShowSideIncome}
                        showHouseholdMembers={values.showHouseholdMembers}
                        setShowHouseholdMembers={setShowHouseholdMembers}
                      />
                    )}
                    {step === 2 && <StepPersonalInfo />}
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
                disabled={!isDebugMode && (connectionError || loading)}
                className={`px-4 py-2 flex items-center gap-1 text-gray-700 rounded-lg transition ml-auto 
                  bg-limeGreen 
                  ${connectionError || loading ? "opacity-50 cursor-not-allowed" : "hover:bg-darkLimeGreen hover:text-white"} 
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
