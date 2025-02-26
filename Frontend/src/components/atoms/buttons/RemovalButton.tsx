import React, { MouseEventHandler } from 'react';

interface RemovalButtonProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

const RemovalButton: React.FC<RemovalButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-all"
    >
      Ta bort
    </button>
  );
};

export default RemovalButton;