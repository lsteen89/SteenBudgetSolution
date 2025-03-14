import React, { useState, useRef, useEffect } from "react";
import MenuComponent from "@components/organisms/Menu/mainMenu/desktop/MenuComponent";
import MobileMenu from "@components/organisms/Menu/mainMenu/mobile/MobileMenu";
import UserSideMenu from "@components/organisms/Menu/sideMenu/UserSideMenu";
import useMediaQuery from "@hooks/useMediaQuery";
import { useAuth } from "@context/AuthProvider";
import DynamicTitle from "@utils/DynamicTitle";
import MediaQueryTest from "@components/Test/MediaQueryTest";
import ToastNotification from "@components/atoms/customToast/ToastNotificationWizard";
import ReactDOM from "react-dom";
import ToastContext from "@context/ToastContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const isDebugMode = import.meta.env.MODE === "development";

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMenuOpen, setMenuOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 1367px)");
  const { authenticated } = useAuth();

  // Toast
  const [toastMessage, setToastMessage] = useState<{
    text: React.ReactNode;
    type: "success" | "error";
    duration?: number;
    id: number;
  } | null>(null);

  const showToast = (
    text: React.ReactNode,
    type: "success" | "error",
    duration = 3000
  ) => {
    setToastMessage({ text, type, duration, id: Date.now() });
  };


  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Accessibility: focus the hamburger when menu closes
  useEffect(() => {
    if (!isMenuOpen && hamburgerButtonRef.current) {
      hamburgerButtonRef.current.focus();
    }
  }, [isMenuOpen]);

  return (
    <ToastContext.Provider value={{ showToast }}>
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
            //hamburgerRef={hamburgerButtonRef}
          />
        )}

        {/* Render the main routed content */}
        {children}
          {toastMessage &&
          ReactDOM.createPortal(
            <ToastNotification
              message={toastMessage.text}
              type={toastMessage.type}
              duration={toastMessage.duration}
              onClose={() => setToastMessage(null)}
            />,
            document.getElementById("toast-root")!
          )}
      </div>
    </ToastContext.Provider>
  );
};

export default AppLayout;
