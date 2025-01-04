import React from 'react';

type FormContainerProps =
  | {
      tag?: 'div';
      className?: string;
      bgColor?: 'default' | 'gradient' | 'custom'; // Predefined styles
      children: React.ReactNode;
    }
  | {
      tag: 'form';
      onSubmit?: React.FormEventHandler<HTMLFormElement>;
      className?: string;
      bgColor?: 'default' | 'gradient' | 'custom'; // Predefined styles
      children: React.ReactNode;
    };

// Define a mapping of styles
const bgStyles: Record<'default' | 'gradient' | 'custom', string> = {
  default: 'bg-white',
  gradient: "bg-gradient-to-b from-[#f3f4f6] to-[#f1f5f9] border border-gray-200", 
  custom: 'bg-gradient-to-b from-limeGreen to-darkLimeGreen border border-gray-300',
};

const FormContainer: React.FC<FormContainerProps> = (props) => {
  const { className = '', children, bgColor = 'default' } = props;

  const bgClass = bgStyles[bgColor]; // Choose the style based on bgColor prop

  if (props.tag === 'form') {
    const { onSubmit } = props;
    return (
      <form
        className={`w-full max-w-lg ${bgClass} p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-lg space-y-6 mb-10 ${className}`}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    );
  } else {
    return (
      <div
        className={`w-full max-w-lg ${bgClass} p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-lg space-y-6 mb-10 ${className}`}
      >
        {children}
      </div>
    );
  }
};

export default FormContainer;
