import React from 'react';
import { motion } from 'framer-motion';
import { PiggyBank, Car, Home, Plane, X, PlusCircle } from 'lucide-react';
import { goalTemplates } from './goalTemplates'; 

interface GoalTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: any) => void;
  onSelectBlank: () => void;
}

const iconMap = {
  Buffert: <PiggyBank className="h-8 w-8 text-darkLimeGreen" />,
  "Ny bil": <Car className="h-8 w-8 text-darkLimeGreen" />,
  Kontantinsats: <Home className="h-8 w-8 text-darkLimeGreen" />,
  "Resa till solen": <Plane className="h-8 w-8 text-darkLimeGreen" />,
};

export const GoalTemplateModal: React.FC<GoalTemplateModalProps> = ({ isOpen, onClose, onSelect, onSelectBlank }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-2xl rounded-2xl bg-[#1a1a1a] p-8 border border-white/20"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white"
          title="Stäng"
          aria-label="Stäng"
        >
          <X size={24} />
        </button>
        <h3 className="text-2xl font-bold text-white mb-6">Välj en mall för ditt sparmål</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalTemplates.map((template) => (
            <button
              key={template.name}
              onClick={() => onSelect(template)}
              className="p-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition"
            >
              {iconMap[template.name]}
              <h4 className="font-semibold text-white mt-3">{template.name}</h4>
              <p className="text-sm text-white/60">{template.targetAmount.toLocaleString('sv-SE')} kr</p>
            </button>
          ))}

          {/* And here's the option for the guy who knows his own mind. */}
          <button
            onClick={onSelectBlank}
            className="p-6 rounded-xl bg-transparent hover:bg-white/10 border-2 border-dashed border-white/20 text-left transition flex flex-col items-center justify-center text-white/60 hover:text-white"
          >
            <PlusCircle size={32} />
            <span className="font-semibold mt-3">Börja från noll</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};