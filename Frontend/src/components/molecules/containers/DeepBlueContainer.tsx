import React from 'react';

interface DeepBlueContainerProps {
  children: React.ReactNode;
  additionalClasses?: string; // Allows custom classes for flexibility
}

const DeepBlueContainer: React.FC<DeepBlueContainerProps> = ({
  children,
  additionalClasses = '',
}) => {
  return (
    <div
      className={`
        bg-[#001F3F] bg-[url('../../assets/Images/MainPageRect.png')] bg-cover bg-center 
        overflow-hidden shadow-md rounded-lg 
        ${additionalClasses}
      `}
    >
      {children}
    </div>
  );
};

export default DeepBlueContainer;
