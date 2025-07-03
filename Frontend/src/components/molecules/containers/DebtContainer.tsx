import React from "react";
import { motion, MotionProps } from "framer-motion";
import { cn } from "@/utils/twMerge";

interface DebtContainerProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
}

const DebtContainer: React.FC<DebtContainerProps> = ({
  children,
  className,
  ...props
}) => (
  <motion.div
    className={cn(
      "relative overflow-hidden rounded-2xl border border-white/5 bg-slate-800/40 shadow-xl backdrop-blur-md",
      className
    )}
    {...props}
  >
    {/* pin-stripe (orange → red to hint “debt”) */}
    <div
      className="absolute inset-y-0 left-0 w-1 rounded-r-2xl bg-gradient-to-b from-amber-400 to-rose-600"
      aria-hidden
    />
    {children}
  </motion.div>
);

export default DebtContainer;