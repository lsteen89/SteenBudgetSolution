import React from 'react';

interface DeepBlueContainerProps {
  children: React.ReactNode;
  maxWidth?: string; // Allows flexible width input like "100%" or "max-w-md"
  additionalClasses?: string; // Allows extra Tailwind classes to be passed
}

const DeepBlueContainer: React.FC<DeepBlueContainerProps> = ({
  children,
  maxWidth = 'max-w-md', // Default Tailwind class for width
  additionalClasses = '',
}) => {
  const dynamicWidth = maxWidth === '100%' ? 'w-full' : maxWidth; // Interpret "100%" as Tailwind's `w-full`

  return (
  <div
    className={`
      flex flex-col justify-start items-center p-6 sm:p-10 
      bg-[#001F3F] bg-[url('../../assets/Images/MainPageRect.png')] bg-cover bg-center 
      overflow-hidden shadow-md rounded-lg pt-12 text-white 
      ${dynamicWidth} ${additionalClasses}
    `}
  >
    {children}
  </div>
  );
};

export default DeepBlueContainer;
