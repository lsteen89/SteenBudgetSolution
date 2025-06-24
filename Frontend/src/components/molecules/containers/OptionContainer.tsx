import React, { ReactNode } from 'react';


interface OptionContainerProps {
  children: ReactNode;
  className?: string; 
}

const OptionContainer: React.FC<OptionContainerProps> = ({ children, className = "" }) => {

  return (
    <div className={`mt-4 bg-white/40 rounded-lg shadow-md text-gray-900 ${className}`}>
      {children}
    </div>
  );
};

export default OptionContainer;