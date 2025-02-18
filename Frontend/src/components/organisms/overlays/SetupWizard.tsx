import React, { useState } from "react";

const SetupWizard: React.FC = () => {
  const [step, setStep] = useState<number>(1);

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-lg w-11/12 md:w-1/2">
        <h2 className="text-2xl font-bold mb-4">Setup Wizard - Step {step}</h2>
        {/* Render wizard content based on current step */}
        <div className="mb-4">
          {/* Add your step-specific components or content here */}
          <p>This is content for step {step}.</p>
        </div>
        <div className="flex justify-between">
          {step > 1 && (
            <button
              onClick={prevStep}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              Back
            </button>
          )}
          <button
            onClick={nextStep}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ml-auto"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
