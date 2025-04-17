import React from "react";

interface SubStepUtilitiesProps {
  initialData?: any;
}

const SubStepUtilities: React.FC<SubStepUtilitiesProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">Utilities Information (Dummy)</h3>
      <p>This is a placeholder for the utilities sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepUtilities;
