import React, { ChangeEvent, FocusEvent, forwardRef } from 'react'; // Added forwardRef

interface TextInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  touched?: boolean;
  onBlur?: () => void; // onBlur is optional, can be used for form validation
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

    },
    ref // This 'ref' is the forwarded ref from the parent (e.g., RHF Controller)
  ) => {
    return (
      <>
        <input
          ref={ref} 
          type="text"
          name={name}
          id={id || name}
          value={value}
          onChange={onChange}
          className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm rounded-lg p-3 bg-white/60 border backdrop-blur-md ${
            error && touched ? "border-red-500" : "border-gray-300"
          }`}
          placeholder={placeholder}
          onBlur={onBlur}
          // {...rest} // You would spread ...rest here if you added it to props
        />
        {/* You could also choose to display the error message here if needed,
            though often it's handled by the parent form component.
        {error && touched && <p className="text-red-500 text-xs mt-1">{error}</p>}
        */}
      </>
    );
  }
);


TextInput.displayName = 'TextInput';

export default TextInput;