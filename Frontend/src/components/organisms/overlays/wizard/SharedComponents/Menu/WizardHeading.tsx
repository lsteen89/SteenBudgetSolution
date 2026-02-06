import React from "react";

interface WizardHeadingProps {
  step: number;
  type: "wizard" | "expenditure";
}

const HEADINGS: Record<WizardHeadingProps["type"], Array<React.ReactNode>> = {
  wizard: [
    "", // Step 0
    "Din Inkomst", // Step 1
    "Dina Utgifter", // Step 2
    "Ditt Sparande",
    "Dina Skulder",
    "Slutför"
  ],
  expenditure: [
    <>
      Ta kontroll över dina{" "}
      <span className="font-extrabold text-darkLimeGreen underline text-3xl drop-shadow-md">
        utgifter
      </span>
    </>,
    "Steg 1: Boende",
    "Steg 2: Räkningar",
    "Steg 3: Mat",
    "Steg 4: Transport",
    "Steg 5: Kläder",
    "Steg 6: Prenumerationer",
  ],
};

const WizardHeading: React.FC<WizardHeadingProps> = ({ type, step }) => {
  const heading = HEADINGS[type]?.[step] ?? "Setup Wizard";

  return (
    <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
      {heading}
    </h2>
  );
};

export default WizardHeading;
