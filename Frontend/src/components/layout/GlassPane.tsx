import React, { ReactNode } from 'react';

interface GlassPaneProps {
  children: ReactNode;
  withBackground?: boolean; // Optional bool to control background color
}

const GlassPane: React.FC<GlassPaneProps> = ({ children, withBackground = true }) => {
  const bgClass = withBackground ? 'bg-white/30' : '';
  return (
    <div className={`text-center p-6 ${bgClass} rounded-2xl shadow-lg backdrop-blur-lg text-white`}>
      {children}
    </div>
  );
};

export default GlassPane;
