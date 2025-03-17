import React from "react";
import { motion } from "framer-motion";

interface WizardStep {
    icon: React.ComponentType<{ size: string | number | undefined }>;
  label: string;
}

interface WizardProgressProps {
  step: number;
  totalSteps: number;
  steps: WizardStep[];
  onStepClick: (step: number) => void;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ step, totalSteps, steps, onStepClick }) => {
  return (
    <div className="relative flex items-center justify-between mb-6">
      {/* Background line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
        <motion.div
          className="h-full bg-darkLimeGreen"
          initial={{ width: "0%" }}
          animate={{ width: step > 0 ? `${(step / totalSteps) * 100 - 12}%` : "0%" }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {steps.map((item, index) => (
        <button
          key={index}
          onClick={() => onStepClick(index+1)}
          className="relative z-10 flex flex-col items-center w-1/4 focus:outline-none"
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
        </button>
      ))}
    </div>
  );
};

export default WizardProgress;
