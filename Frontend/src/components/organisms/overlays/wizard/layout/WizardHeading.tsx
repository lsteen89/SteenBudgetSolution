import React from "react";

interface WizardHeadingProps {
  step: number;
}

const WizardHeading: React.FC<WizardHeadingProps> = ({ step }) => {
  const getHeading = () => {
    switch (step) {
      case 0:
        return (
          <>
            Välkommen till{" "}
            <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
              eBudget
            </span>
          </>
        );
      case 1:
        return (
          <>
            Steg 1: Vad har du för{" "}
            <span className="font-semibold text-blue-600"> inkomster</span>
          </>
        );  
      case 2:
        return "Steg 2: Utgifter";
      case 3:
        return "Steg 3: Sparande";
      case 4:
        return "Steg 4: Bekräfta";
      default:
        return "Setup Wizard";
    }
  };

  return (
    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
      {getHeading()}
    </h2>
  );
};

export default WizardHeading;
