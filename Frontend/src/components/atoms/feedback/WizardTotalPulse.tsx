import React, { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { cn } from "@/lib/utils";

export const WizardTotalPulse: React.FC<{
    pulseKey: number;
    className?: string;
    children: React.ReactNode;
}> = ({ pulseKey, className, children }) => {
    const controls = useAnimationControls();

    useEffect(() => {
        if (pulseKey <= 0) return;

        controls.set({ scale: 1, y: 0, filter: "none" });

        controls.start({
            scale: [1, 1.12, 1],
            opacity: [0.9, 1, 0.95],
            transition: { duration: 0.18, ease: "easeOut" },
        });
    }, [pulseKey, controls]);

    return (
        <motion.div animate={controls} className={cn("inline-block", className)}>
            {children}
        </motion.div>
    );
};
