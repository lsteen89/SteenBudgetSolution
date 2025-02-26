import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HelpSectionProps {
  label: string;
  helpText: string;
  detailedHelpText: string;
  children: React.ReactNode;
}

const HelpSection: React.FC<HelpSectionProps> = ({ label, helpText, detailedHelpText, children }) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const handleToggleHelp = () => {
    setShowHelp((prev) => !prev);
    setShowDetailedHelp(false); // Close detailed help when toggling
  };

  const handleToggleDetailedHelp = () => {
    setShowDetailedHelp((prev) => !prev);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowHelp(false);
        setShowDetailedHelp(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={helpRef}>
      <label className="block text-sm font-medium flex items-center gap-2 pb-2">
        {label}
        <button
          type="button"
          onClick={handleToggleHelp}
          className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
          title={`Vad räknas som ${label.toLowerCase()}?`}
          aria-label={`Toggle help for ${label}`}
        >
          <Info size={16} />
        </button>
      </label>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute z-10 mt-2 p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-72"
          >
            <p className="text-sm">{helpText}</p>
            <button
              type="button"
              onClick={handleToggleDetailedHelp}
              className="underline text-darkLimeGreen mt-2 block"
              title="Läs mer om detta ämne"
              aria-label="Läs mer om detta ämne"
            >
              Läs mer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailedHelp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute z-20 mt-2 p-4 bg-white border border-gray-300 rounded-lg shadow-lg w-80"
          >
            <div className="flex justify-between items-center">
              <p className="text-gray-900 text-sm">{detailedHelpText}</p>
              <button 
                type="button"
                onClick={() => setShowDetailedHelp(false)}
                className="text-gray-600 hover:text-gray-900"
                title="Stäng detaljerad hjälp"
                aria-label="Stäng detaljerad hjälp"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
};

export default HelpSection;
