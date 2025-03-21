import React from "react";

interface SubStepRentProps {
  initialData?: any;
}

const SubStepRent: React.FC<SubStepRentProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">Rent Information (Dummy)</h3>
      <p>This is a placeholder for the rent sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepRent;