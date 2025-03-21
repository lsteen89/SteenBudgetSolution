import React from "react";

interface SubStepSubscriptionsProps {
  initialData?: any;
}

const SubStepSubscriptions: React.FC<SubStepSubscriptionsProps> = ({ initialData }) => {
  return (
    <div className="text-center">
      <h3 className="text-xl font-semibold mb-2">subscription Information (Dummy)</h3>
      <p>This is a placeholder for the subscription sub-step.</p>
      {initialData && (
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(initialData, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default SubStepSubscriptions;
