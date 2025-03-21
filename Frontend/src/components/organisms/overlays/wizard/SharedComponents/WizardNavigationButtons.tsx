import React from 'react';
import {  ChevronLeft,  ChevronRight } from "lucide-react";
import styles from "@components/organisms/overlays/wizard/SharedComponents/WizardNavigationButtons.module.css";

interface WizardNavigationButtonsProps {
  step: number;
  prevStep: () => void;
  nextStep: () => void;
  connectionError: boolean;
  initLoading: boolean;
  transitionLoading: boolean;
  isDebugMode: boolean;
  showShakeAnimation: boolean;
}

const WizardNavigationButtons: React.FC<WizardNavigationButtonsProps> = ({
  step,
  prevStep,
  nextStep,
  connectionError,
  initLoading,
  transitionLoading,
  isDebugMode,
  showShakeAnimation,
}) => {
  const isDisabled = !isDebugMode && (connectionError || initLoading || transitionLoading);

  return (
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
      <button
        type="button"
        onClick={nextStep}
        disabled={isDisabled}
        className={`px-4 py-2 flex items-center gap-1 text-gray-700 rounded-lg transition ml-auto bg-limeGreen 
          ${isDisabled ? "opacity-50 cursor-not-allowed" : "hover:bg-darkLimeGreen hover:text-white"} 
          ${showShakeAnimation ? styles["animate-shake"] : ""}`}
      >
        {step === 0 ? "Start" : "Nästa"}
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

export default WizardNavigationButtons;
