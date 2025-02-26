import React, { ReactNode } from 'react';

interface OptionContainerProps {
  children: ReactNode;
}

const OptionContainer: React.FC<OptionContainerProps> = ({ children }) => {
  return (
    <div className="mt-4 p-4 bg-white/40 rounded-lg shadow-md text-gray-900">
      {children}
    </div>
  );
};

export default OptionContainer;