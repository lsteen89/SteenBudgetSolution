import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepCarouselProps {
  steps: { icon: React.FC<React.SVGProps<SVGSVGElement>>; label: string }[];
  currentStep: number;
  onStepClick: (step: number) => void;
  visibleSteps?: number; 
}

const StepCarousel: React.FC<StepCarouselProps> = ({
  steps,
  currentStep,
  onStepClick,
  visibleSteps = 1,
}) => {
  // Helper to wrap index if we want circular navigation
  const wrapIndex = (idx: number) => (idx + steps.length) % steps.length;

  // Indices to display: current step plus neighbors
  const indicesToShow: number[] = [];
  for (let offset = -visibleSteps; offset <= visibleSteps; offset++) {
    indicesToShow.push(wrapIndex(currentStep + offset));
  }

  // Horizontal spacing between icons
  const horizontalSpacing = 60;

  return (
    // Increase container height so labels are visible; remove overflow-hidden if needed
    <div className="relative flex items-center justify-center w-full h-32">
      <AnimatePresence>
        {indicesToShow.map((stepIndex) => {
          let diff = stepIndex - currentStep;
          if (diff > steps.length / 2) diff -= steps.length;
          if (diff < -steps.length / 2) diff += steps.length;

          const isCurrent = diff === 0;
          const Icon = steps[stepIndex].icon;
          const xPos = diff * horizontalSpacing;

          let targetScale = 0.8;
          let targetOpacity = 0.6;
          if (isCurrent) {
            targetScale = 1.5;
            targetOpacity = 1;
          } else if (Math.abs(diff) === 1) {
            targetScale = 0.5;
            targetOpacity = 0.8;
          }

          return (
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, scale: 0.5, x: 0 }}
              animate={{
                opacity: targetOpacity,
                scale: targetScale,
                x: xPos,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                type: 'spring',
                stiffness: 150,
                damping: 14,
                mass: 0.6,
              }}
              onClick={() => onStepClick(stepIndex)}
              className={`absolute cursor-pointer flex flex-col items-center ${
                isCurrent ? 'text-green-500' : ''
              }`}
              style={{ width: 50, height: 50 }}
            >
              <Icon className="w-12 h-12" />
              {isCurrent && (
                <span
                    title={steps[stepIndex].label}
                    className="text-sm mt-0 pointer-events-none absolute top-full left-1/2 transform -translate-x-1/2 whitespace-normal text-center"
                    style={{ maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                    {steps[stepIndex].label}
                </span>
                )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default StepCarousel;
