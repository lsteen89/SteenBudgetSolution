import React from 'react';

interface DeepBlueContainerProps {
  children: React.ReactNode;
}

const DeepBlueContainer: React.FC<DeepBlueContainerProps> = ({ children }) => {
  return (
    <div
      className="
        flex flex-col justify-start items-center p-10 
        bg-[url('../../assets/Images/MainPageRect.svg')] bg-cover bg-center 
        overflow-hidden shadow-md rounded-lg pt-12 text-white"
    >
      {children}
    </div>
  );
};

export default DeepBlueContainer;