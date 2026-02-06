import React, { useEffect } from "react";
import { motion, useAnimationControls } from "framer-motion";

export const WizardDecorationPulse: React.FC<{
    pulseKey: number;
    children: React.ReactNode;
}> = ({ pulseKey, children }) => {
    const controls = useAnimationControls();

    useEffect(() => {
        if (pulseKey <= 0) return;

        // reset to baseline first (important!)
        controls.set({
            scale: 1,
            rotate: 0,
            filter: "drop-shadow(0px 0px 18px rgba(163,230,53,0.55))",
        });

        // then play pulse
        controls.start({
            scale: [1, 1.12, 1],
            opacity: [0.9, 1, 0.95],
            transition: { duration: 0.18, ease: "easeOut" },
        });
    }, [pulseKey, controls]);

    return (
        <motion.div
            animate={controls}
            // 👇 baseline glow always visible
            style={{ filter: "drop-shadow(0px 0px 18px rgba(163,230,53,0.55))" }}
        >
            {children}
        </motion.div>
    );
};
