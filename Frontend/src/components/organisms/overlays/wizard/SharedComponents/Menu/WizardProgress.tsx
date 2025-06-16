import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx'; // I'm adding clsx for cleaner classes. If you don't have it, you can use template literals.

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
  
  // If we're in development mode, we allow clicking the steps.
  const isDevMode = process.env.NODE_ENV === 'development';

  return (
    <div className="relative flex items-center justify-between mb-6">
      {/* Background and progress line */}
      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
        <motion.div
          className="h-full bg-darkLimeGreen"
          initial={{ width: '0%' }}
          animate={{
            width: step > 0 ? `${(step / totalSteps) * 100 + adjustmentValue}%` : '0%',
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Icons */}
      {steps.map((item, index) => {
        const currentStepIndex = index + 1;
        const isActive = step === currentStepIndex;
        const iconSize = isActive ? 32 : 16;

        return (
          <button
            type="button"
            key={index}
            // If we are in dev mode, the click handler works. Otherwise, it does nothing.
            onClick={isDevMode ? () => onStepClick(currentStepIndex) : undefined}
            // The button is disabled and looks disabled in production.
            disabled={!isDevMode}
            className={clsx(
              'relative z-10 flex flex-col items-center w-1/4 focus:outline-none',
              // If not in dev mode, it's not a pointer. It's a rock.
              !isDevMode && 'cursor-not-allowed'
            )}
          >
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 ${
                step > currentStepIndex
                  ? 'bg-darkLimeGreen text-white'
                  : isActive
                  ? 'border-2 border-white/50 text-darkLimeGreen bg-white/20 backdrop-blur-sm transform scale-150 shadow-lg'
                  : 'bg-gray-300 text-gray-700'
              }`}
            >
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