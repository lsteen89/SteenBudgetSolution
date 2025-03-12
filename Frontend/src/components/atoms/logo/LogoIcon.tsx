import React from 'react';
import logo from '@assets/Images/MobileBirdNoShadow.png';

const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <img src={logo} alt="Logo" className={`w-16 h-16 ${className}`} />
);

export default LogoIcon;