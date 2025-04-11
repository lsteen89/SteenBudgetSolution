import { ChevronLeft, ChevronRight } from "lucide-react";

interface StepButtonProps {
  isLeft?: boolean;
  onClick: () => void;
  className?: string; // optional prop for extra classes
}

const StepButton: React.FC<StepButtonProps> = ({ isLeft, onClick, className = "" }) => {
  return (
    <button
    type="button"
      className={`text-darkLimeGreen py-2 rounded-full hover:bg-darkLimeGreen hover:text-white transition ${className}`}
      onClick={onClick}
      aria-label={isLeft ? "Previous step" : "Next step"}
    >
      {isLeft ? <ChevronLeft size={44} /> : <ChevronRight size={44} />}
    </button>
  );
};

export default StepButton;
