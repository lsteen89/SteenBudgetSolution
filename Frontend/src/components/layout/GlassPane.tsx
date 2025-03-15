import React, { ReactNode } from 'react';

interface GlassPaneProps {
  children: ReactNode;
}

const GlassPane: React.FC<GlassPaneProps> = ({ children }) => {
  return (
    <div className="text-center p-6 bg-white/30 rounded-2xl shadow-lg backdrop-blur-lg text-white">
      {children}
    </div>
  );
};

export default GlassPane;