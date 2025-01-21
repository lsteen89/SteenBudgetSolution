// App.tsx
import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from "@context/AuthProvider"; 
import AppContent from './AppContent'; // Adjust the path as necessary
import useMediaQuery from './hooks/useMediaQuery';

const App: React.FC = () => {
  const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = (): void => setMenuOpen((prev) => !prev);

  const isDesktop = useMediaQuery('(min-width: 1367px)'); // Adjusted breakpoint. 
  const isDebugMode = process.env.NODE_ENV === 'development';

  // Return focus to hamburger button when menu closes
  useEffect(() => {
    if (!isMenuOpen && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus();
    }
  }, [isMenuOpen]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          hamburgerButtonRef={hamburgerButtonRef}
          isDesktop={isDesktop}
          isDebugMode={isDebugMode}
        />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
