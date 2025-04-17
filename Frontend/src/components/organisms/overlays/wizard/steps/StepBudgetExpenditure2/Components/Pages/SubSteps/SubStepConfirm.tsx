import React from "react";

interface SubStepConfirmProps {
  initialData?: any;
}

const SubStepConfirm: React.FC<SubStepConfirmProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">ClothingP Information (Dummy)</h3>
      <p>This is a placeholder for the confirmation sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepConfirm;
