import React from "react";

interface ToggleButtonProps {
  isShowing: boolean;
  onToggle: () => void;
  showLabel?: string;
  hideLabel?: string;
}

const ToggleButton: React.FC<ToggleButtonProps> = ({
  isShowing,
  onToggle,
  showLabel = "Visa",
  hideLabel = "Dölj",
}) => {
  return (
    <button
      type="button" 
      onClick={onToggle}
      className="mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105 transition-all"
    >
      {isShowing ? `${hideLabel} ❌` : showLabel}
    </button>
  );
};

export default ToggleButton;