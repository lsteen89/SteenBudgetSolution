import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@hooks/useMediaQuery';

interface HelpSectionProps {
  label: string;
  helpText: React.ReactNode;
  detailedHelpText?: React.ReactNode;
  children?: React.ReactNode;
}

const HelpSection: React.FC<HelpSectionProps> = ({
  label,
  helpText,
  detailedHelpText,
  children,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showDetailedHelp, setShowDetailedHelp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalContentRef = useRef<HTMLDivElement>(null);

  const isMdUp = useMediaQuery('(min-width: 768px)');
  const isLgUp = useMediaQuery('(min-width: 1024px)');

  const handleToggleHelp = () => {
    setShowHelp((prev) => !prev);
    setShowDetailedHelp(false);
  };

  const handleToggleDetailedHelp = () => {
    setShowDetailedHelp((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only when on md up, check if click was outside modal content.
      if (
        isMdUp &&
        modalContentRef.current &&
        !modalContentRef.current.contains(event.target as Node)
      ) {
        setShowHelp(false);
        setShowDetailedHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () =>
      document.removeEventListener('mousedown', handleClickOutside);
  }, [isMdUp]);

  return (
    <div className="relative" ref={containerRef}>
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
            className={`fixed z-10 inset-0 flex items-center justify-center ${
              isLgUp
                ? 'lg:absolute lg:inset-auto lg:bg-transparent lg:backdrop-blur-0 lg:mt-2'
                : 'bg-black bg-opacity-30 backdrop-blur-sm'
            }`}
          >
            <div
              ref={modalContentRef}
              className="relative p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-11/12 max-w-sm lg:w-72"
            >
              <button
                type="button"
                onClick={handleToggleHelp}
                className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
                title="Stäng hjälp"
                aria-label="Stäng hjälp"
              >
                <X size={16} />
              </button>
              <p className="text-sm">{helpText}</p>
              {detailedHelpText && (
                <button
                  type="button"
                  onClick={handleToggleDetailedHelp}
                  className="underline text-darkLimeGreen mt-2 block"
                  title="Läs mer om detta ämne"
                  aria-label="Läs mer om detta ämne"
                >
                  Läs mer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailedHelp && detailedHelpText && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed z-20 inset-0 flex items-center justify-center ${
              isLgUp
                ? 'lg:absolute lg:inset-auto lg:bg-transparent lg:backdrop-blur-0 lg:mt-2'
                : 'bg-black bg-opacity-30 backdrop-blur-sm'
            }`}
          >
            <div
              ref={modalContentRef}
              className="relative p-4 bg-customBlue2 text-gray-900 rounded-lg shadow-lg border border-gray-400 w-11/12 max-w-sm lg:w-80"
            >
              <button
                type="button"
                onClick={() => setShowDetailedHelp(false)}
                className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
                title="Stäng detaljerad hjälp"
                aria-label="Stäng detaljerad hjälp"
              >
                <X size={18} />
              </button>
              <p className="text-gray-900 text-sm">{detailedHelpText}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </div>
  );
};

export default HelpSection;

