import React, { ReactNode } from "react";

interface WizardStepContainerProps {
  children: ReactNode;
  className?: string;
  disableDefaultWidth?: boolean; // optional prop to disable default width
}

const WizardStepContainer: React.FC<WizardStepContainerProps> = ({ children, className, disableDefaultWidth }) => {
  return (
    <div
      className={`
        space-y-4 p-6 rounded-xl shadow-md mx-auto bg-darkBlueMenuColor 
        ${!disableDefaultWidth ? "max-w-lg" : ""} 
        ${className || ""}
      `}
    >
      {children}
    </div>
  );
};

export default WizardStepContainer;
