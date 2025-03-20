import React from "react";

interface SubStepTransportProps {
  initialData?: any;
}

const SubStepTransport: React.FC<SubStepTransportProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">Transport Information (Dummy)</h3>
      <p>This is a placeholder for the Transport sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepTransport;
