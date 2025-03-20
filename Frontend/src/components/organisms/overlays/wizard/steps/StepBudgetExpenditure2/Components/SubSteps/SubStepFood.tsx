import React from "react";

interface SubStepFoodProps {
  initialData?: any;
}

const SubStepFood: React.FC<SubStepFoodProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">Food Information (Dummy)</h3>
      <p>This is a placeholder for the food sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepFood;
