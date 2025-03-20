import React, { ReactNode } from "react";

interface WizardStepContainerProps {
  children: ReactNode;
  className?: string;
}

const WizardStepContainer: React.FC<WizardStepContainerProps> = ({ children, className }) => {
  return (
    <div className={`space-y-4 p-6 rounded-xl shadow-md max-w-lg mx-auto bg-darkBlueMenuColor  ${className}`}>
      {children}
    </div>
  );
};

export default WizardStepContainer;