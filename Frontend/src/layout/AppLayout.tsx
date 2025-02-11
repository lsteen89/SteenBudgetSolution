// src/layout/AppLayout.tsx
import React, { useState, useRef, useEffect } from "react";
import MenuComponent from "@components/organisms/Menu/MenuComponent";
import MobileMenu from "@components/organisms/Menu/MobileMenu";
import UserSideMenu from "@components/organisms/Menu/UserSideMenu";
import useMediaQuery from "@hooks/useMediaQuery";
import { useAuth } from "@context/AuthProvider";
import DynamicTitle from "@utils/DynamicTitle";
import MediaQueryTest from "@components/Test/MediaQueryTest";

interface AppLayoutProps {
  children: React.ReactNode;
}

const isDebugMode = import.meta.env.MODE === "development";

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1367px)");
  const { authenticated } = useAuth();

  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Accessibility: focus the hamburger when menu closes
  useEffect(() => {
    if (!isMenuOpen && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus();
    }
  }, [isMenuOpen]);

  return (
    <div className="App">
      <DynamicTitle />
      <MediaQueryTest />

      {/* Desktop vs Mobile menu */}
      {isDesktop ? <MenuComponent /> : <MobileMenu />}

      {/* Side menu for authenticated users */}
      {(authenticated || isDebugMode) && (
        <UserSideMenu
          isOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          hamburgerRef={hamburgerButtonRef}
        />
      )}

      {/* Render the main routed content */}
      {children}
    </div>
  );
};

export default AppLayout;
