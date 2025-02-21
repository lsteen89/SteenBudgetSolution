import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Wallet, User, CheckCircle, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import WizardStepContainer from "@components/molecules/containers/WizardStepContainer";

// 1. Import step components
import StepWelcome from "./steps/StepWelcome";
import StepBudgetInfo from "./steps/StepBudgetInfo";
import StepPersonalInfo from "./steps/StepPersonalInfo";
import StepPreferences from "./steps/StepPreferences";
import StepConfirmation from "./steps/StepConfirmation";

// Same steps array for the icons and labels
const steps = [
  { icon: Wallet, label: "Inkomster" },
  { icon: User, label: "Sparande" },
  { icon: Settings, label: "Utgifter" },
  { icon: CheckCircle, label: "Confirmation" },
];

const SetupWizard: React.FC = () => {
  const [step, setStep] = useState<number>(0);
  const totalSteps = steps.length; // 4

  const nextStep = (): void => setStep((prev) => Math.min(prev + 1, totalSteps));
  const prevStep = (): void => setStep((prev) => Math.max(prev - 1, 0));
  const closeWizard = (): void => alert("Setup Wizard Closed"); // Replace with actual close function

  return (
    <div className="fixed inset-0 z-[2000] overflow-y-auto w-full h-full">
    <div className="flex items-center justify-center bg-black bg-opacity-50 min-h-screen py-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-standardMenuColor bg-opacity-40 backdrop-blur-lg p-6 rounded-2xl shadow-xl w-11/12 relative"
      >
        {/* Exit Button */}
        <button
          type="button"
          onClick={closeWizard}
          title="Close Wizard"
          className="absolute top-3 right-3 text-red-600 hover:text-red-800"
        >
          <X size={24} />
        </button>

        {/* Heading logic: same as before */}
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {step === 0 ? (
            <>
              Välkommen till{" "}
              <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
                eBudget
              </span>
            </>
          ) : (
            `Insamling av budget data - Steg ${step}`
          )}
        </h2>

        {/* Step Progress Indicator - Always Visible */}
        <div className="relative flex items-center justify-between mb-6">
          {/* Flowing Progress Line */}
          <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
            <motion.div
              className="h-full bg-darkLimeGreen"
              initial={{ width: "0%" }}
              animate={{ width: step > 0 ? `${(step / totalSteps) * 100}%` : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {steps.map((item, index) => (
            <div key={index} className="relative z-10 flex flex-col items-center w-1/4">
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
              <span className="mt-2 text-sm font-medium text-gray-800">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Step Content (switched from inline to separate components) */}
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
              <StepWelcome />
            ) : (
              // Here, show placeholders for steps 1..4
              <>
                {step === 1 && <StepBudgetInfo />}
                {step === 2 && <StepPersonalInfo />}
                {step === 3 && <StepPreferences />}
                {step === 4 && <StepConfirmation />}
              </>
            )}
            </WizardStepContainer>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          {step > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="px-4 py-2 flex items-center gap-1 bg-limeGreen text-gray-700 rounded-lg hover:bg-customBlue2 transition"
            >
              <ChevronLeft size={18} /> Back
            </button>
          )}
          <button
            type="button"
            onClick={nextStep}
            className="px-4 py-2 flex items-center gap-1 bg-limeGreen text-gray-700 rounded-lg hover:bg-customBlue2 transition ml-auto"
          >
            {step === 0 ? "Start" : "Next"} <ChevronRight size={18} />
          </button>
        </div>
      </motion.div>
    </div>
    </div>
  );
};

export default SetupWizard;
