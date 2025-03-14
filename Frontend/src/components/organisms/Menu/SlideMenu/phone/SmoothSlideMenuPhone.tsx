import React from 'react';
import { CSSTransition } from 'react-transition-group';
import './slide-menu.css';

interface SmoothSlideMenuProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

const SmoothSlideMenu: React.FC<SmoothSlideMenuProps> = ({ isOpen, toggleMenu }) => (
  
  <CSSTransition
    in={isOpen}
    timeout={1100}
    classNames="slide"
    //unmountOnExit // Uncomment this line to unmount the component when not visible
    
  >
    <div className="fixed top-0 left-0 w-64 h-full bg-white shadow-lg z-50">
      <button
        onClick={toggleMenu}
        aria-label="Close"
        className="absolute top-4 right-4"
      >
        ✕
      </button>
      {/* Menu items... */}
    </div>
  </CSSTransition>
);

export default SmoothSlideMenu;
