import React, { ChangeEvent } from 'react';

interface TextInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  touched?: boolean;
  onBlur?: () => void;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder = "", error, touched, name, id, onBlur  }) => {
  return (
    <>
      <input
        type="text"
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm rounded-lg p-3 bg-white/60 border backdrop-blur-md ${error && touched ? "border-red-500" : "border-gray-300"}`}
        placeholder={placeholder}
        onBlur={onBlur} 
      />
    </>
  );
};

export default TextInput;