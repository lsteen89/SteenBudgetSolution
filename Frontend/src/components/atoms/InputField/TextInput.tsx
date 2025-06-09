import React, { ChangeEvent, FocusEvent, forwardRef, InputHTMLAttributes } from 'react'; // Added InputHTMLAttributes

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onBlur' | 'value'> {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  touched?: boolean;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void; // Consistent with HTML input
  className?: string; // Added className prop
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      value,
      onChange,
      placeholder = "",
      error,
      touched,
      name,
      id,
      onBlur,
      className = "", 
      ...rest // Spread any other native input props
    },
    ref
  ) => {
    const baseClasses = `shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm rounded-lg p-3 bg-white/60 border backdrop-blur-md`;
    const errorClasses = error && touched ? "border-red-500" : "border-gray-300";

    return (
      <>
        <input
          ref={ref}
          type="text"
          name={name}
          id={id || name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`${baseClasses} ${errorClasses} ${className}`} // Apply base, error, and external classes
          placeholder={placeholder}
          {...rest} // Spread other props like autoComplete, required, etc.
        />
        {/* Error message display can be handled here or by the parent form */}
        {/* {error && touched && <p className="text-red-500 text-xs mt-1">{error}</p>} */}
      </>
    );
  }
);

TextInput.displayName = 'TextInput';

export default TextInput;