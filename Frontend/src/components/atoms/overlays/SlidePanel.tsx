import React, { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Side = "top" | "left" | "right";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    side?: Side;

    /** For top sheets (your mobile menu) */
    topOffsetPx?: number;

    /** Panel styling */
    className?: string;

    /** If true, clicking the dark backdrop closes */
    closeOnBackdrop?: boolean;

    /** ✅ render panel content */
    children?: React.ReactNode;
};

export default function SlidePanel({
    isOpen,
    onClose,
    side = "top",
    topOffsetPx = 56,
    className,
    closeOnBackdrop = true,
    children,
}: Props) {
    const reduce = useReducedMotion();

    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [isOpen, onClose]);

    const duration = reduce ? 0 : 0.28;
    const ease: any = [0.22, 1, 0.36, 1];

    const variants =
        side === "top"
            ? {
                initial: { y: -16, opacity: 0 },
                animate: { y: 0, opacity: 1, transition: { duration, ease } },
                exit: { y: -16, opacity: 0, transition: { duration, ease } },
            }
            : side === "left"
                ? {
                    initial: { x: "-14%", opacity: 0 },
                    animate: { x: 0, opacity: 1, transition: { duration, ease } },
                    exit: { x: "-14%", opacity: 0, transition: { duration, ease } },
                }
                : {
                    initial: { x: "14%", opacity: 0 },
                    animate: { x: 0, opacity: 1, transition: { duration, ease } },
                    exit: { x: "14%", opacity: 0, transition: { duration, ease } },
                };

    return (
        <AnimatePresence>
            {isOpen ? (
                <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <button
                        type="button"
                        aria-label="Stäng"
                        className="absolute inset-0 bg-black/35"
                        onClick={closeOnBackdrop ? onClose : undefined}
                    />

                    {/* Panel */}
                    <motion.div
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        variants={variants}
                        style={side === "top" ? { marginTop: topOffsetPx } : undefined}
                        className={className}
                    >
                        {children}
                    </motion.div>
                </div>
            ) : null}
        </AnimatePresence>
    );
}
