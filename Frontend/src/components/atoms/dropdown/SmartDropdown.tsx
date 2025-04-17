import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface SmartDropdownProps<T extends string | number> {
  options: T[];
  value: T | null;
  onValueChange: (val: T | null) => void;
  placeholder?: React.ReactNode; 
  searchable?: boolean;
  showResetOption?: boolean;
  className?: string;
}

const SmartDropdown = <T extends string | number>({
  options,
  value,
  onValueChange,
  placeholder = "Välj ett alternativ...",
  searchable = false,
  showResetOption = true,
  className = "",
}: SmartDropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((opt) =>
    opt.toString().toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (val: T | null) => {
    onValueChange(val);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex justify-between items-center p-3 rounded-xl bg-white/60 backdrop-blur-md border border-gray-300 shadow-md text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-darkLimeGreen"
      >
        <span className="text-left w-full whitespace-normal break-words">
        {value !== null ? value : placeholder}
        </span>
        <ChevronDown className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full min-w-0 max-h-[18rem] overflow-y-auto bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 px-1 sm:px-0">
          {/* Searchbar */}
          {searchable && (
            <div className="p-2">
              <input
                type="text"
                placeholder="Sök..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm shadow-sm focus:ring-1 focus:ring-darkLimeGreen"
              />
            </div>
          )}

          {/* Reset Option */}
          {showResetOption && (
            <div
              onClick={() => handleSelect(null)}
              className="cursor-pointer px-4 py-2 text-sm text-gray-500 hover:bg-red-100 hover:text-red-600 flex items-center gap-2"
            >
              <X size={16} /> Rensa val
            </div>
          )}

          {/* Options */}
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, i) => (
              <div
                key={i}
                onClick={() => handleSelect(option)}
                className={`cursor-pointer px-4 py-2 text-sm break-words max-w-full truncate sm:whitespace-normal hover:bg-darkLimeGreen hover:text-white ${
                    value === option ? "bg-limeGreen text-white font-bold" : "text-gray-800"
                  }`}
                  title={option.toString()}
                >
                  {option}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500 italic">Inga matchningar</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartDropdown;
