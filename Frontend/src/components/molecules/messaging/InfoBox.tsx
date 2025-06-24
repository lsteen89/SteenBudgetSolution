// In InfoBox.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';

interface InfoBoxProps {
  children: React.ReactNode;
  className?: string;
  icon?: boolean;
}

const InfoBox: React.FC<InfoBoxProps> = ({ children, className, icon = true }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className={`rounded-xl bg-slate-800/50 p-4 text-sm text-white/90 ring-1 ring-inset ring-white/10 ${className || ''}`}
    >
      {/* THE FIX:
        This container is now a `div`. It can safely contain complex children
        like form inputs without causing HTML nesting errors. The flexbox
        classes remain the same to preserve the layout.
      */}
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-2">
        {icon && <Info size={18} className="mt-0.5 shrink-0 text-darkLimeGreen" />}

        {/* This content wrapper is also now a `div`. This ensures that
          whatever you pass as `children` (text, inputs, other components)
          is placed in a valid container. It also preserves the two-part
          structure that the flex layout depends on.
        */}
        <div>{children}</div>
      </div>
    </motion.div>
  );
};

export default InfoBox;