import React from 'react';
import { motion, MotionProps } from 'framer-motion';

// We accept all the standard motion props to keep it flexible
interface GoalContainerProps extends MotionProps {
  children: React.ReactNode;
  className?: string;
}

const GoalContainer: React.FC<GoalContainerProps> = ({ children, className, ...props }) => {
  return (
    <motion.div
      
      className={`relative overflow-hidden rounded-2xl border border-white/5 bg-slate-800/40 shadow-xl backdrop-blur-md ${className || ''}`}
      {...props} // Pass through all the animation props
    >
      {/* The Signature Pinstripe */}
      <div className="absolute inset-y-0 left-0 w-1 rounded-r-2xl bg-gradient-to-b from-darkLimeGreen to-green-500" aria-hidden />
      
      {/* The actual content goes here */}
      {children}
    </motion.div>
  );
};

export default GoalContainer;
