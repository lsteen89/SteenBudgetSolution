import React from 'react';

interface DeepBlueContainerProps {
  children: React.ReactNode;
  additionalClasses?: string; // Allows custom classes for flexibility
  noRoundedCorners?: boolean; // Suppresses the default rounded-lg
}

const DeepBlueContainer: React.FC<DeepBlueContainerProps> = ({
  children,
  additionalClasses = '',
  noRoundedCorners = false, // Default: rounded corners are applied
}) => {
  return (
    <div
      className={`
        bg-[#001F3F] bg-[url('../../assets/Components/Shapes/MainPageRect.png')] bg-cover bg-center 
        overflow-hidden shadow-md 
        ${noRoundedCorners ? '' : 'rounded-lg'} 
        ${additionalClasses}
      `}
    >
      {children}
    </div>
  );
};

export default DeepBlueContainer;
