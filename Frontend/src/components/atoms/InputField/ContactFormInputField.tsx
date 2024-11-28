interface ContactFormInputFieldProps {
  type?: string; // Default to "text"
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: () => void; // Optional onBlur prop
  width?: string;
  height?: string;
  multiline?: boolean; // Prop for multiline input
}

const ContactFormInputField: React.FC<ContactFormInputFieldProps> = ({
  type = "text",
  placeholder,
  value,
  onChange,
  onBlur, // Added here
  width = "500px",
  height = "60px",
  multiline = false,
}) => {
  return (
    <div className="relative" style={{ width, height }}>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur} // Passed to textarea
          className="w-full h-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] rounded-xl px-4 text-gray-800 text-lg font-bold tracking-wide focus:outline-none border border-gray-300 focus:border-blue-500 resize-none"
        />
      ) : (
        <input
          type={type} // Pass type for input
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur} // Passed to input
          className="w-full h-full bg-white shadow-[0_8px_24px_rgba(0,0,0,0.2)] rounded-xl px-4 text-gray-800 text-lg font-bold tracking-wide focus:outline-none border border-gray-300 focus:border-blue-500"
        />
      )}
    </div>
  );
};

export default ContactFormInputField;
