import React, { useState } from 'react';
import { FaBars } from 'react-icons/fa'; // Placeholder for your icon
import { Link } from 'react-router-dom';
import MobileBird from '@assets/Images/MobileBird.png';

const MobileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* Top Bar with Icon and Hamburger */}
      <div className="flex justify-between items-center bg-standardMenuColor px-4 py-2 shadow-md relative z-50">
        {/* Left Icon */}
        <Link to="/" className="flex items-center">
          <img src={MobileBird} alt="Mobile Bird" className="w-16 h-16" />
        </Link>

        {/* Hamburger Button */}
        <button
          onClick={toggleMenu}
          className="text-gray-700 text-2xl focus:outline-none"
          aria-label="Toggle Menu"
        >
          <FaBars />
        </button>
      </div>

      {/* Overlay Menu Content */}
      <div
        className={`absolute top-0 left-0 w-full bg-standardMenuColor shadow-lg transition-all duration-300 ease-in-out ${
          isOpen ? 'h-[60vh] opacity-100' : 'h-0 opacity-0'
        } z-40`}
        style={{ overflow: isOpen ? 'visible' : 'hidden' }}
      >
        {isOpen && (
          <nav className="flex flex-col items-center justify-center h-full">
            <button
              onClick={toggleMenu}
              className="text-gray-700 text-xl self-end mr-8 mb-4"
              aria-label="Close Menu"
            >
              ✕
            </button>
            <ul className="space-y-6 text-center">
              <li>
                <a href="/" className="text-gray-700 text-lg font-medium">
                  Hem
                </a>
              </li>
              <li>
                <a href="/about-us" className="text-gray-700 text-lg font-medium">
                  Om eBudget
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-700 text-lg font-medium">
                  Kontakt
                </a>
              </li>
              <li>
                <a href="/faq" className="text-gray-700 text-lg font-medium">
                  Vanliga frågor
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-700 text-lg font-medium">
                  Logga in
                </a>
              </li>
            </ul>
          </nav>
        )}
      </div>
    </div>
  );
};

export default MobileMenu;
