import React, { ChangeEvent, FocusEvent } from 'react';

interface NumberInputProps {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  step?: string | number;
  onBlur?: () => void; 
}

const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  placeholder = "",
  error,
  name,
  id,
  step = "any",
  onBlur,
}) => {
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    console.log("NumberInput: onBlur triggered"); //add log here
    if (onBlur) {
      onBlur(); // Call the onBlur prop function if it exists
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
        className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm border-gray-300 rounded-lg p-3 bg-white/60 backdrop-blur-md ${error ? "border-red-500" : ""}`}
        placeholder={placeholder}
        onBlur={handleBlur} // Add the onBlur handler
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </>
  );
};

export default NumberInput;