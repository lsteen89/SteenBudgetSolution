import React from 'react';

type FormContainerProps =
  | {
      tag?: 'div';
      className?: string;
      children: React.ReactNode;
    }
  | {
      tag: 'form';
      onSubmit?: React.FormEventHandler<HTMLFormElement>;
      className?: string;
      children: React.ReactNode;
    };

const FormContainer: React.FC<FormContainerProps> = (props) => {
  const { className = '', children } = props;

  if (props.tag === 'form') {
    // It's a form element
    const { onSubmit } = props;
    return (
      <form
        className={`w-full max-w-lg bg-white p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-lg space-y-6 mb-10 ${className}`}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    );
  } else {
    // Default to div if tag is 'div' or undefined
    return (
      <div
        className={`w-full max-w-lg bg-white p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-lg space-y-6 mb-10 ${className}`}
      >
        {children}
      </div>
    );
  }
};

export default FormContainer;
