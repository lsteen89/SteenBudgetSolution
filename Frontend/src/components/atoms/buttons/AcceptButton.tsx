import React, { MouseEventHandler } from 'react';

interface AcceptButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}

const AcceptButton: React.FC<AcceptButtonProps> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="mt-2 bg-darkLimeGreen hover:bg-darkBlueMenuColor text-white font-bold py-3 px-6 rounded-xl shadow-md transform hover:scale-105  transition-all"

    >
      {children}
    </button>
  );
};

export default AcceptButton;