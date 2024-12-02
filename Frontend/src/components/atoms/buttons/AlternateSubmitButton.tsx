/**
 * Alternate SubmitButton Component
 *
 * A reusable button component with flexible styling, loading state, and optional enhanced hover effects.
 *
 * Read sumbission for SubmitButton for more details.
 * AlternateSubmitButton is a variation of SubmitButton with a different color scheme.
 */

import React from 'react';

interface SubmitButtonProps {
  isSubmitting: boolean;
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'large' | 'default';
  enhanceOnHover?: boolean; // Optional flag for enhanced hover behavior
  icon?: React.ReactNode; // Optional icon prop
}

const sizeClasses = {
  small: 'text-[16px] py-2 px-4',
  default: 'text-[20px] py-3 px-6',
  large: 'text-[32px] py-4 px-8',
};

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  label = 'Submit',
  onClick,
  style,
  type = 'button',
  size = 'default',
  enhanceOnHover = false,
  icon,
}) => {
  return (
    <button
      type={type}
      disabled={isSubmitting}
      onClick={onClick}
      style={style}
      className={`inline-flex items-center justify-center font-bold bg-[limeGreen] 
      rounded-[20px] shadow-md transition-all ease-out duration-300 border-none text-[#1C1C1C]
      ${sizeClasses[size]} 
      ${
        isSubmitting
          ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
          : enhanceOnHover
          ? 'hover:bg-[#32CD32] hover:text-white hover:scale-110'
          : 'hover:bg-[#85e085]'
      }`}
    >
      {isSubmitting ? (
        <div
          className="w-[20px] h-[20px] border-4 border-[#f3f3f3] border-t-[#333] 
          rounded-full animate-spin ml-2"
          aria-label="Loading spinner"
        ></div>
      ) : (
        <>
          {icon && (
            <span
              className={`mr-2 transition-colors duration-300 ${
                enhanceOnHover ? 'hover:text-white' : ''
              }`}
            >
              {icon}
            </span>
          )}
          <span
            className={`transition-colors duration-300 ${
              enhanceOnHover ? 'hover:text-white' : ''
            }`}
          >
            {label}
          </span>
        </>
      )}
    </button>
  );
};

export default SubmitButton;

