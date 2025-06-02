import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HelpSectionDarkProps {
  /**
   * The label associated with the help trigger.
   * Used to generate accessible names and as a base for unique IDs.
   */
  label: string;

  /** The content to display inside the help popup. Can be simple text or JSX. */
  helpText: React.ReactNode;

  /**
   * Optional suffix to ensure ID uniqueness, especially when using components in a loop.
   * Example: an index, or a unique part of a field name.
   */
  idSuffix?: string;

  /** Optional: Custom class for the trigger button. */
  triggerButtonClassName?: string;

  /** Optional: Custom class for the help popup. */
  popupClassName?: string;

  /** Optional: Size for the Info icon. Defaults to 16. */
  infoIconSize?: number;

  /** Optional: Size for the Close (X) icon. Defaults to 18. */
  closeIconSize?: number;
}

const HelpSectionDark: React.FC<HelpSectionDarkProps> = ({
  label,
  helpText,
  idSuffix,
  triggerButtonClassName = "text-darkLimeGreen hover:text-green-700 focus:outline-none",
  popupClassName = "absolute z-20 mt-1 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-md shadow-xl border border-gray-300 dark:border-gray-700 w-full max-w-xs sm:max-w-sm",
  infoIconSize = 16,
  closeIconSize = 18,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);

  // Sanitize label and idSuffix for use in HTML id attributes
  const sanitizeForId = (str: string) => str.replace(/[^a-zA-Z0-9-_]/g, '_');
  const sanitizedLabel = sanitizeForId(label);
  const sanitizedIdSuffix = idSuffix ? `-${sanitizeForId(idSuffix)}` : '';

  const popupGeneratedId = `help-popup-${sanitizedLabel}${sanitizedIdSuffix}`;
  const triggerAccessibleName = `Visa information om ${label.toLowerCase().replace(":", "")}`;
  const ariaControlsValue = showHelp ? popupGeneratedId : undefined;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        helpRef.current &&
        !helpRef.current.contains(target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(target)
      ) {
        setShowHelp(false);
      }
    }
    if (showHelp) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showHelp]);

  if (!helpText) {
    return null; // Don't render if no helpText
  }

  return (
    <>
      <button
        ref={toggleButtonRef}
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setShowHelp((prev) => !prev);
        }}
        className={triggerButtonClassName}
        title={triggerAccessibleName}
        aria-label={triggerAccessibleName}
        // This is type-correct and semantically correct for ARIA
        //aria-expanded={showHelp ? "true" : "false"}
        // This correctly omits the attribute when undefined
        //aria-controls={ariaControlsValue}
      >
        <Info size={infoIconSize} />
      </button>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            id={popupGeneratedId}
            ref={helpRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={popupClassName}
            role="tooltip"
          >
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 focus:outline-none"
              title="Stäng"
              aria-label="Stäng hjälprutan"
            >
              <X size={closeIconSize} />
            </button>
            <div className="text-sm pr-5">{helpText}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpSectionDark;