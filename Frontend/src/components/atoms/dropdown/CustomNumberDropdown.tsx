import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

interface CustomNumberDropdownProps {
  value: number | null;
  onValueChange: (val: number | null) => void;
  placeholder?: string;
  end: number;
  className?: string;
}

const CustomNumberDropdown: React.FC<CustomNumberDropdownProps> = ({
  value,
  onValueChange,
  placeholder = "Välj ett nummer...",
  end,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSelect = (val: number) => {
    onValueChange(val);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 rounded-xl bg-white/60 backdrop-blur-md border border-gray-300 shadow-md text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-darkLimeGreen"
      >
        <span>{value !== null ? value : placeholder}</span>
        <ChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown list */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full max-h-[14rem] overflow-y-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200">
          {Array.from({ length: end + 1 }, (_, i) => (
            <div
              key={i}
              onClick={() => handleSelect(i)}
              className={`cursor-pointer px-4 py-2 hover:bg-darkLimeGreen hover:text-white ${
                value === i ? "bg-limeGreen text-white font-bold" : "text-gray-800"
              }`}
            >
              {i}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomNumberDropdown;
