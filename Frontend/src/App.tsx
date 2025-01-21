import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './Pages/Home/HomePage';
import UserSideMenu from '@components/organisms/Menu/UserSideMenu';
import Registration from './Pages/auth/Registration';
import CheckEmailPage from './Pages/auth/CheckEmailPage';
import AboutUs from './Pages/info/AboutUs';
import Contact from './Pages/info/Contact';
import Faq from './Pages/info/Faq';
import Login from './Pages/auth/LoginPage';
import NotFoundPage from './Pages/info/NotFoundPage';
import EmailConfirmationPage from './Pages/auth/EmailConfirmationPage';  
import '@styles/animations.css';
import './index.css';
import { mockVerifyEmail } from '@mocks/mockServices/verifyEmailMock';
import { realVerifyEmailWrapper } from '@api/Services/User/realVerifyEmailWrapper';
import RequestPasswordReset from '@pages/auth/RequestPasswordReset';
import ResetPasswordPage from '@pages/auth/PerformPasswordReset';
import useMediaQuery from './hooks/useMediaQuery';
import { AuthProvider, useAuth } from "@context/AuthProvider"; 
import Dashboard from '@pages/dashboard/dashboardhome';
import ProtectedRoute from "@routes/ProtectedRoute";
import MobileMenu from './components/organisms/Menu/MobileMenu';
import MenuComponent from './components/organisms/Menu/MenuComponent';
import DynamicTitle from '@utils/DynamicTitle'; 
import MediaQueryTest from '@components/Test/MediaQueryTest';

const App: React.FC = () => {
  const [isMenuOpen, setMenuOpen] = useState<boolean>(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);

  const toggleMenu = (): void => setMenuOpen((prev) => !prev);

  const auth = useAuth();
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
          auth={auth}
          isDesktop={isDesktop}
          isDebugMode={isDebugMode}
        />
      </BrowserRouter>
    </AuthProvider>
  );
};

const AppContent: React.FC<{
  isMenuOpen: boolean;
  toggleMenu: () => void;
  hamburgerButtonRef: React.RefObject<HTMLButtonElement>;
  auth: ReturnType<typeof useAuth>;
  isDesktop: boolean;
  isDebugMode: boolean;
}> = ({ isMenuOpen, toggleMenu, hamburgerButtonRef, auth, isDesktop, isDebugMode }) => {
  const location = useLocation(); // Get current location

  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.includes(location.pathname);
  console.log({
    authenticated: auth?.authenticated,
    debugMode: isDebugMode,
    protectedRoute: isProtectedRoute,
    isDesktop,
  });
  return (
    <div className="App">
      <DynamicTitle />
      <MediaQueryTest />
      {/* Render MobileMenu for phones and iPads in portrait mode */}
      {isDesktop ? <MenuComponent /> : <MobileMenu />}

      {/* UserSideMenu - Display only for authenticated users on protected routes */}
      {(auth?.authenticated || isDebugMode) && isProtectedRoute && (
        <UserSideMenu isOpen={isMenuOpen} toggleMenu={toggleMenu} />
      )}

      {/* Main Content */}
      <Routes>
        
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/registration" element={<Registration />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route 
          path="/email-confirmation" 
          element={
            <EmailConfirmationPage
              verifyEmail={isDebugMode ? mockVerifyEmail : realVerifyEmailWrapper}
              debugToken={isDebugMode ? 'debug-token-123' : undefined}
            />
          }
        />
        <Route path="/about-us" element={<AboutUs />} />
        <Route path="/forgotpassword" element={<RequestPasswordReset />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<NotFoundPage />} />
        
        {/* Protected Route */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
};

export default App;
