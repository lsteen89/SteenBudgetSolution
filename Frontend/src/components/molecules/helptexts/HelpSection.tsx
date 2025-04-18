import React, { useState, useRef, useEffect } from 'react';
import { Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import useMediaQuery from '@hooks/useMediaQuery';
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    UseFloatingReturn,
} from '@floating-ui/react-dom';
import { useMergeRefs, FloatingPortal } from '@floating-ui/react';

interface HelpSectionProps {
    label: string;
    helpText: React.ReactNode;
    detailedHelpText?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

const HelpSection: React.FC<HelpSectionProps> = ({
    label,
    helpText,
    detailedHelpText,
    children,
    className,
}) => {
    /* ---------- state ---------- */
    const [showHelp, setShowHelp]             = useState(false);
    const [showDetailed, setShowDetailed] = useState(false);
    const [manualDesktopPosition, setManualDesktopPosition] = useState<{ left: number; top: number } | null>(null);
    const [initialButtonRect, setInitialButtonRect] = useState<{ left: number; top: number; bottom: number } | null>(null);

    /* ---------- refs ---------- */
    const containerRef         = useRef<HTMLDivElement>(null);
    const modalContentRef     = useRef<HTMLDivElement>(null);
    const helpButtonRef         = useRef<HTMLButtonElement>(null);

    /* ---------- media ---------- */
    const isMdUp = useMediaQuery('(min-width: 768px)');
    const isLgUp = useMediaQuery('(min-width: 1024px)');

    /* ---------- floating‑ui ---------- */
    const { refs, floatingStyles, update }: UseFloatingReturn<HTMLButtonElement> = useFloating({
        placement: 'bottom', // Still use for mobile
        strategy : 'fixed',   // Still use for mobile
        middleware: [
            offset(10),
            flip(),
            shift({ padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
    });

    /* merge the *object* reference ref with your own button ref */
    const mergedRef = useMergeRefs([refs.setReference, helpButtonRef]);

    /* ---------- Capture initial button position on desktop mount ---------- */
    useEffect(() => {
        if (isLgUp && helpButtonRef.current && !initialButtonRect) {
            const rect = helpButtonRef.current.getBoundingClientRect();
            setInitialButtonRect({ left: rect.left, top: rect.top, bottom: rect.bottom });
        }
    }, [isLgUp, initialButtonRect]);

    /* ---------- handlers ---------- */
    const toggleHelp         = () => {
      setShowHelp(p => !p);
      setShowDetailed(false);
      if (isLgUp && helpButtonRef.current && initialButtonRect && !showHelp) {
          setManualDesktopPosition({
              left: initialButtonRect.left - 80, // Add some offset
              top: initialButtonRect.top + 10,   // Adjust offset to appear closer
          });
      } else {
          setManualDesktopPosition(null);
      }
  };
    const toggleDetailed = () =>     setShowDetailed(p => !p);

    /* outside‑click (desktop) */
    useEffect(() => {
        if (!isMdUp) return;
        const onOutside = (e: MouseEvent) => {
            if (
                modalContentRef.current &&
                !modalContentRef.current.contains(e.target as Node) &&
                !containerRef.current?.contains(e.target as Node)
            ) {
                setShowHelp(false);
                setShowDetailed(false);
                setManualDesktopPosition(null);
            }
        };
        document.addEventListener('click', onOutside);
        return () => document.removeEventListener('click', onOutside);
    }, [isMdUp]);

    /* restore focus */
    useEffect(() => {
        if (!showHelp) helpButtonRef.current?.focus();
    }, [showHelp]);

/* ---------- shared pop‑up ---------- */
    const Popup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const desktopStyle = isLgUp && manualDesktopPosition
            ? { position: 'absolute', left: manualDesktopPosition.left, top: manualDesktopPosition.top }
            : floatingStyles;

        return (
            <div
                ref={refs.floating as React.Ref<HTMLDivElement>}
                style={desktopStyle as React.CSSProperties}
                className={`z-modal pointer-events-none ${isLgUp
                    ? 'absolute bg-transparent mt-2'
                    : 'fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm'
                }`}
            >
                <motion.div
                    ref={modalContentRef}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="relative pointer-events-auto w-11/12 max-w-md lg:w-72 p-4 rounded-lg bg-customBlue2 text-gray-900 shadow-lg border border-gray-400"
                >
                    <button
                        onClick={toggleHelp}
                        aria-label="Stäng hjälp"
                        title="Stäng hjälp"
                        className="absolute top-2 right-2 text-red-700 hover:text-green-700 focus:outline-none"
                    >
                        <X size={16} />
                    </button>
                    <p className="text-sm">{helpText}</p>
                    {detailedHelpText && (
                        <button
                            onClick={toggleDetailed}
                            className="underline text-darkLimeGreen mt-2 block"
                        >
                            Läs mer
                        </button>
                    )}
                </motion.div>
            </div>
        );
    };

    return (
        <div ref={containerRef} className={`relative ${className ?? ''}`}>
            {/* label + icon */}
            <label className="block text-sm font-medium flex items-center gap-2 pb-2">
                {label}
                <button
                    ref={mergedRef}
                    type="button"
                    aria-label={`Toggle help for ${label}`}
                    title={`Vad räknas som ${label.toLowerCase()}?`}
                    onClick={toggleHelp}
                    className="text-darkLimeGreen hover:text-green-700 focus:outline-none"
                >
                    <Info size={16} />
                </button>
            </label>

            {/* brief help */}
            <AnimatePresence>
                {showHelp && (
                    <FloatingPortal>
                        <Popup>
                            <p>{helpText}</p>
                        </Popup>
                    </FloatingPortal>
                )}
            </AnimatePresence>

            {/* detailed help */}
            <AnimatePresence>
                {showDetailed && detailedHelpText && (
                    <FloatingPortal>
                        <Popup>
                            <p>{helpText}</p>
                        </Popup>
                    </FloatingPortal>
                )}
            </AnimatePresence>

            {children}
        </div>
    );
};

export default HelpSection;