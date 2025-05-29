import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Simplify navigation
import MobileBird from '@assets/Images/MobileBird.png';
import { useAuth } from "@hooks/auth/useAuth"; // Custom hook for authentication
import UserSideMenu from '../../sideMenu/UserSideMenu'; 

const MobileMenu: React.FC = () => {
  // State for menus
  const [isHamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  const [isUserSideMenuOpen, setUserSideMenuOpen] = useState(false);

  // Authentication and navigation
  const auth = useAuth();
  const isDebugMode = process.env.NODE_ENV === 'development';
  // Handle menu icon click
  const handleIconClick = () => {
    setUserSideMenuOpen((prev) => !prev); // Toggle side menu
  };
  // Ref for side menu (removed if not needed)
  // const userMenuRef = useRef<HTMLDivElement>(null); // Removed since not used

  useEffect(() => {
    if (isHamburgerMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }, [isHamburgerMenuOpen]);


  // Close menu on route change
  useEffect(() => {
    setHamburgerMenuOpen(false); // Collapse menu
  }, [location.pathname]); // Runs whenever the route changes
  return (
    <div className="relative">
      {/* Top Bar */}
      <div className="flex justify-between items-center bg-standardMenuColor px-4 py-2 shadow-md relative z-50 w-full">
        
        {/* Mobile Bird Icon */}
        {auth?.authenticated || isDebugMode ? (
          <button
            onClick={handleIconClick}
            className="flex flex-col focus:outline-none items-center"
            aria-label="Toggle User Menu or Redirect"
          >
            <img src={MobileBird} alt="Mobile Bird" className="w-16 h-16 animate-img-pulse" />
            {/* <span className="text-darkLimeGreen text-md font-extrabold">Budgetmeny</span> */}
          </button>
          
        ) : (
          <Link to="/" className="flex items-center">
            <img src={MobileBird} alt="Mobile Bird" className="w-16 h-16 animate-img-pulse" />
            {/* <span className="text-darkLimeGreen text-sm mt-1">Startsida</span> */}
          </Link>
        )}

        {/* User Side Menu */}
        <UserSideMenu
          isOpen={isUserSideMenuOpen}
          toggleMenu={() => setUserSideMenuOpen((prev) => !prev)} // Inline toggle logic
        />

        {/* Hamburger Button */}
        <button
          onClick={() => setHamburgerMenuOpen((prev) => !prev)} // Inline toggle logic
          className="relative flex justify-center items-center w-10 h-10 focus:outline-none"
          aria-label="Toggle Hamburger Menu"
        >
          {/* Top Line */}
          <span
            className={`absolute h-0.5 w-full bg-gray-700 transform transition-transform duration-500 ease-in-out ${
              isHamburgerMenuOpen ? "rotate-45" : "-translate-y-1.5"
            }`}
          ></span>
          {/* Middle Line (Invisible Patty) */}
          <span
            className="absolute h-0.5 w-full bg-gray-700 opacity-0 "
          ></span>
          {/* Bottom Line */}
          <span
            className={`absolute h-0.5 w-full bg-gray-700 transform transition-transform duration-500 ease-in-out ${
              isHamburgerMenuOpen ? "-rotate-45" : "translate-y-1.5"
            }`}
          ></span>
        </button>
      </div>

      {/* Overlay Menu Content */}
      <div
        className={`absolute top-0 left-0 w-full bg-standardMenuColor shadow-lg transition-all duration-300 ease-in-out ${
          isHamburgerMenuOpen ? 'h-[60vh] opacity-100' : 'h-0 opacity-0'
        } z-40`}
        style={{ overflow: isHamburgerMenuOpen ? 'visible' : 'hidden' }}
      >
        <nav className="flex flex-col items-center justify-center h-full">

          <ul className="space-y-6 text-center">
            <li><Link to="/" className="text-gray-700 text-lg font-medium">Hem</Link></li>
            <li><Link to="/about-us" className="text-gray-700 text-lg font-medium">Om eBudget</Link></li>
            <li><Link to="/contact" className="text-gray-700 text-lg font-medium">Kontakt</Link></li>
            <li><Link to="/faq" className="text-gray-700 text-lg font-medium">Vanliga frågor</Link></li>
            <li>
              {auth?.authenticated ? (
                <button
                  onClick={auth.logout}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                >
                  Logga ut
                </button>
              ) : (
                <Link to="/login" className="text-gray-700 text-lg font-medium">
                  Logga in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default MobileMenu;
