import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

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
  useBlackText?: boolean; 
}

const WizardProgress: React.FC<WizardProgressProps> = ({
  step,
  totalSteps,
  steps,
  onStepClick,
  adjustProgress = false,
  useBlackText = false, 
}) => {
  const adjustmentValue = adjustProgress ? -5 : -12;
  const isDevMode = process.env.NODE_ENV === 'development';


  const isLastStep = step === totalSteps;
  const progressWidth = isLastStep
    ? (totalSteps === 5 ? '99%' : '100%') 
    : step > 0
    ? `${(step / totalSteps) * 100 + adjustmentValue}%`
    : '0%';

  return (
    <div
      className={clsx(
        'relative flex items-center mb-6',
        totalSteps === 1 ? 'justify-center' : 'justify-between'
      )}
    >
      {totalSteps > 1 && (
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 z-0 transform -translate-y-1/2">
          {/* The main green progress bar */}
          <motion.div
            className="h-full bg-darkLimeGreen relative overflow-hidden"
            initial={{ width: '0%' }}

            animate={{
              width: progressWidth,
              scale: isLastStep ? [1, 1.02, 1] : 1,
            }}
            transition={{
              width: { duration: 0.4, ease: 'easeInOut' },
              scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {/* The Glimmer of Mithril continues its duty */}
            <motion.div
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
            />
          </motion.div>
        </div>
      )}

      {/* Icons */}
      {steps.map((item, index) => {
        const currentStepIndex = index + 1;
        const isActive = step === currentStepIndex;
        const iconSize = isActive ? 32 : 16;

        return (
          <button
            type="button"
            key={index}
            onClick={isDevMode ? () => onStepClick(currentStepIndex) : undefined}
            disabled={!isDevMode}
            className={clsx(
              'relative z-10 flex flex-col items-center focus:outline-none',
              totalSteps > 1 && 'w-1/4',
              !isDevMode && 'cursor-not-allowed'
            )}
          >
            <div
              className={clsx(
                'flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300',
                step > currentStepIndex && 'bg-darkLimeGreen text-white',
                isActive && 'border-2 border-white/50 text-darkLimeGreen bg-white/20 backdrop-blur-sm transform scale-150 shadow-lg',
                step < currentStepIndex && 'bg-gray-300 text-gray-700'
              )}
            >
              <item.icon size={iconSize} />
            </div>

            <span
                className={clsx(
                    'mt-2 text-sm text-center transition-all',
                    // Font weight is still determined by the active state
                    isActive ? 'font-bold' : 'font-medium',

                    isActive
                        ? (useBlackText ? 'text-darkLimeGreen' : 'text-darkLimeGreen') // Active step color
                        : 'text-black' // Inactive steps are always black
                )}
            >
                {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default WizardProgress;