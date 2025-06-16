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
  adjustProgress?: boolean;
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  step,
  totalSteps,
  steps,
  onStepClick,
  adjustProgress = false,
}) => {
  const adjustmentValue = adjustProgress ? -5 : -12;

  return (
    <div className="relative flex items-center justify-between mb-6">
      {/* Background and progress line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
        <motion.div
          className="h-full bg-darkLimeGreen"
          initial={{ width: "0%" }}
          animate={{
            width: step > 0 ? `${(step / totalSteps) * 100 + adjustmentValue}%` : "0%",
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Icons */}
      {steps.map((item, index) => {
        const currentStepIndex = index + 1;
        const isActive = step === currentStepIndex;

        // Dynamically set the icon size. Magnify the active one!
        const iconSize = isActive ? 32 : 16;

        return (
          <button
            type="button"
            key={index}
            onClick={() => onStepClick(currentStepIndex)}
            className="relative z-10 flex flex-col items-center w-1/4 focus:outline-none"
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                // 1. COMPLETED: Solid green background
                step > currentStepIndex
                  ? "bg-darkLimeGreen text-white"
                // 2. CURRENT: "Glaslike" / "Magnifying Glass" style
                : isActive
                  ? "border-2 border-white/50 text-darkLimeGreen bg-white/20 backdrop-blur-sm transform scale-150 shadow-lg"
                // 3. FUTURE: Neutral gray background
                  : "bg-gray-300 text-gray-700"
              }`}
            >
              {/* Use the dynamic iconSize here */}
              <item.icon size={iconSize} />
            </div>
            <span className="mt-2 text-sm font-medium text-gray-800">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default WizardProgress;