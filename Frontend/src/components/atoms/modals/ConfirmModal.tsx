import React from "react";
import { Check, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  title, 
  description,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 shadow-lg w-full max-w-md border border-customBlue2">
        <h3 className="text-lg font-bold text-darkLimeGreen mb-2">{title}</h3>
        <p className="text-sm text-black mb-4">{description}</p>


        <div className="flex justify-between w-full">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-1 text-sm rounded-lg bg-red-600 hover:bg-red-800"
          >
            <X size={16} />
            Avbryt
          </button>
          
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-4 py-1 text-sm rounded-lg bg-darkLimeGreen text-white hover:bg-green-600"
          >
            <Check size={16} />
            Ja!
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
