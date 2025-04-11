import React, { ChangeEvent, FocusEvent } from 'react';

interface NumberInputProps {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  touched?: boolean;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder = "",
  error,
  name,
  id,
  step = "any",
  touched,
  onBlur,
}) => {
  // 2) Forward the event to the onBlur prop if it exists
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      onBlur(e); 
    }
  };

  return (
    <>
      <input
        type="number"
        step={step}
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen border block w-full sm:text-sm rounded-lg p-3 bg-white/60 backdrop-blur-md  ${error && touched ? "border-red-500" : "border-gray-300"}`}
        placeholder={placeholder}
        onBlur={handleBlur} 
      />

    </>
  );
};

export default NumberInput;