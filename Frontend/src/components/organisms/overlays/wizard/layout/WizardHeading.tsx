import React from "react";

interface WizardHeadingProps {
  step: number;
  type: "wizard" | "expenditure";
}

const WizardHeading: React.FC<WizardHeadingProps> = ({ type, step }) => {
  const getHeading = () => {
    if(type === "wizard"){
    switch (step) {
      case 0:
        return (
          <>
            Ange dina{" "}
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
  }
  else if(type === "expenditure"){
    switch (step) {
      case 0:
        return (
          <>
            Ta kontroll över dina{" "}
            <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
              utgifter
            </span>
          </>
        );
      case 1:
        return (
          <>
            Steg 1: Vad har du för{" "}
            <span className="font-semibold text-blue-600"> boendekostnader?</span>
          </>
        );  
      case 2:
        return "Steg 2: Fasta utgifter";
      case 3:
        return "Steg 3: Matkostnader";
      case 4:
        return "Steg 4: Transportkostnader";
      case 5:
        return "Steg 5: Kläder";
      case 6:
        return "Steg 6: Prenumerationer";
      default:
        return "Setup Wizard";
    }
  }
  };
  return (
    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
      {getHeading()}
    </h2>
  );
};

export default WizardHeading;
