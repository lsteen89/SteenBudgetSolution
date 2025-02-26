import React, { ChangeEvent } from 'react';

interface TextInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  error?: string;
  name?: string;
  id?: string;
  onBlur?: () => void;
}

const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder = "", error, name, id, onBlur  }) => {
  return (
    <>
      <input
        type="text"
        name={name}
        id={id}
        value={value}
        onChange={onChange}
        className={`shadow-md focus:ring-darkLimeGreen focus:border-darkLimeGreen block w-full sm:text-sm border-gray-300 rounded-lg p-3 bg-white/60 backdrop-blur-md ${error ? "border-red-500" : ""}`}
        placeholder={placeholder}
        onBlur={onBlur} 
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </>
  );
};

export default TextInput;