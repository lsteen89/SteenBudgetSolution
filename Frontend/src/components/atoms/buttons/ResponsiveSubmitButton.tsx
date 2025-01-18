// ResponsiveSubmitButton.tsx
import React from 'react';

interface ResponsiveSubmitButtonProps {
  isSubmitting: boolean;
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  className?: string;

  // Flexible styling props
  fontSize?: string;
  padding?: string;
  bgColor?: string;
  hoverBgColor?: string;
  disabledBgColor?: string;
  disabledTextColor?: string;

  // Optional enhanceOnHover effect
  enhanceOnHover?: boolean;
}

const ResponsiveSubmitButton: React.FC<ResponsiveSubmitButtonProps> = ({
  isSubmitting,
  label = 'Submit',
  onClick,
  style,
  type = 'button',
  className = '',
  fontSize = 'text-base',
  padding = 'py-3 px-6',
  bgColor = 'bg-limeGreen',      
  hoverBgColor = 'bg-[#001F3F]',  
  disabledBgColor = 'bg-gray-300',
  disabledTextColor = 'text-gray-600',
  enhanceOnHover = false,
}) => {
  return (
    <button
      type={type}
      disabled={isSubmitting}
      onClick={onClick}
      style={style}
      className={`
        inline-flex items-center justify-center
        font-bold rounded-2xl shadow-md transition-all ease-out duration-300
        border-none 
        ${fontSize}
        ${padding}
        ${
          isSubmitting
            ? `${disabledBgColor} ${disabledTextColor} cursor-not-allowed`
            : `
              ${bgColor}
              hover:${hoverBgColor}
              ${enhanceOnHover ? 'hover:scale-110 hover:text-white' : ''}
            `
        }
        ${className}
      `}
    >
      {isSubmitting ? (
        <div
          className="w-5 h-5 border-4 border-gray-200 border-t-gray-900
                     rounded-full animate-spin"
          aria-label="Loading spinner"
        />
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
};

export default ResponsiveSubmitButton;
