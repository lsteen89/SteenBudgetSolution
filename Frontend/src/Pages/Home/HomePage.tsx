import React from 'react';
import useMediaQuery from '@hooks/useMediaQuery';
import DesktopHomePage from './DesktopHomePage';
import MobileHomePage from './MobileHomePage';

const HomePage: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 810px)'); // Detect mobile screens

  return isMobile ? <MobileHomePage /> : <DesktopHomePage />;
};

export default HomePage;
