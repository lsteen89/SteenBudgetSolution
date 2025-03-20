import { ChevronLeft, ChevronRight } from "lucide-react";

interface StepButtonProps {
  isLeft?: boolean;
  onClick: () => void;
}

const StepButton: React.FC<StepButtonProps> = ({ isLeft, onClick }) => {
  return (
    <button
      className="text-darkLimeGreen px-6 py-2 rounded-full hover:bg-darkLimeGreen hover:text-white transition"
      onClick={onClick}
      aria-label={isLeft ? "Previous step" : "Next step"}
    >
      {isLeft ? <ChevronLeft size={44} /> : <ChevronRight size={44} />}
    </button>
  );
};

export default StepButton;