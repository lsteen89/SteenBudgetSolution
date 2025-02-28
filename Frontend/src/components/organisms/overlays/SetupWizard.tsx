import React, { useState, useEffect, useRef } from "react";
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

//toast
import { toast } from "react-toastify";

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

const SetupWizard: React.FC<SetupWizardProps> = ({ onClose }) => {
  // 1. Handling wizard closure
  const handleWizardClose = () => {
    onClose(); // parent's callback
  };

  // 2. State for wizard data & session
  const [wizardData, setWizardData] = useState<any>({});
  const [wizardSessionId, setWizardSessionId] = useState<string>("");

  // 3. Step & validation
  const [step, setStep] = useState<number>(0);
  const totalSteps = steps.length;
  const [isStepValid, setIsStepValid] = useState(true);

  // 4. Refs to child steps
  const stepBudgetInfoRef = useRef<StepBudgetInfoRef>(null);
  // If you need other steps to manage their own state & validation,
  // create refs for them as well (e.g. stepPersonalInfoRef, etc.)

  // 5. Next / Previous Step Logic
  const nextStep = async () => {
    // Example check for Step 1: StepBudgetInfo
    if (step === 1) {
      // 1) Validate the child
      const isValid = stepBudgetInfoRef.current?.validateFields();
      if (!isValid) {
        setIsStepValid(false);
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

  // 6. Partial save function
  const handleSaveStepData = async (stepNumber: number, data: any) => {
    try {
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

  // 7. On mount, start (or resume) the wizard
  useEffect(() => {
    const initWizard = async () => {
      try {
        const { wizardSessionId, message }: StartWizardResponse = await startWizard();
        if (!wizardSessionId) {
          toast.error(message);
          return;
        }
        setWizardSessionId(wizardSessionId);
        console.log("Wizard session started:", wizardSessionId);
        // Attempt to fetch existing data for that session
        const existingData = await getWizardData(wizardSessionId);
        setWizardData(existingData || {});
      } catch (error) {
        console.error("Error starting wizard:", error);
        toast.error("Error starting wizard session.");
      }
    };
    initWizard();
  }, []);

  // 8. If on step 0 (Welcome), always allow "Next"
  //    Otherwise, default to "not valid" until validated
  useEffect(() => {
    if (step === 0) {
      setIsStepValid(true);
    } else {
      setIsStepValid(false);
    }
  }, [step]);

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
                  <StepWelcome />
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
                Back
              </button>
            )}
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid}
              className={`px-4 py-2 flex items-center gap-1 ${
                isStepValid
                  ? "bg-limeGreen hover:bg-customBlue2"
                  : "bg-gray-400 cursor-not-allowed"
              } text-gray-700 rounded-lg transition ml-auto`}
            >
              {step === 0 ? "Start" : "Next"}
              <ChevronRight size={18} />
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SetupWizard;
