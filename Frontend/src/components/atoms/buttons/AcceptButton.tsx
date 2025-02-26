import React, { MouseEventHandler } from 'react';

interface AcceptButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}

const AcceptButton: React.FC<AcceptButtonProps> = ({ onClick, children }) => {
  return (
    <button
      onClick={onClick}
      className="mt-2 bg-darkLimeGreen hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-all"
    >
      {children}
    </button>
  );
};

export default AcceptButton;