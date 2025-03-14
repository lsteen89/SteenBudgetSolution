import React, { useEffect, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import FocusTrap from 'focus-trap-react';
import MobileSideMenuButtonContainer from '@components/organisms/Menu/sideMenu/mobile/MobileSideMenuButtonContainer';
import NavigationMenu from '@components/organisms/Menu/sideMenu/NavigationMenu';
import '@components/organisms/Menu/SlideMenu/phone/slide-menu-phone.css';

interface MobileSideMenuProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

const MobileSideMenu: React.FC<MobileSideMenuProps> = ({ isOpen, toggleMenu }) => {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Close menu on Escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        toggleMenu();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, toggleMenu]);

  return (
    <CSSTransition
      in={isOpen}
      timeout={300}
      classNames="slide"
      unmountOnExit
      nodeRef={nodeRef}
    >
      {/* 
        Use FocusTrap to keep focus inside the menu for accessibility
        when the menu is open.
      */}
      <FocusTrap active={isOpen}>
        {/* 
          A parent container that holds both 
          the side menu and the dark overlay 
        */}
        <div className="fixed inset-0 z-50">
          {/* 
            Mobile Side Menu: Slide in from the left. 
            We rely on the .slide-* classes from the .css file
            to handle the transition (translateX).
          */}
          <div
            ref={nodeRef}
            id="user-side-menu-mobile"
            className={`
              slide-menu
              bg-gradient-to-br from-customBlue1 to-standardMenuColor
              w-3/4 max-w-sm
              h-full
              sm:w-1/2
              shadow-lg
              z-50
              rounded-tr-2xl
              rounded-br-2xl
              opacity-95
              relative
            `}
            aria-modal="true"
            role="dialog"
          >
            {/* 
              Top area with the close button 
              (using your MobileSideMenuButtonContainer)
            */}
            <div className="flex items-center justify-end p-4">
              <MobileSideMenuButtonContainer toggleMenu={toggleMenu} />
            </div>

            {/* 
              Navigation links 
              (close the menu on link click via onLinkClick prop)
            */}
            <nav className="px-14 pb-6">
              <NavigationMenu onLinkClick={toggleMenu} />
            </nav>
          </div>

          {/* 
            Dark overlay behind the menu 
            to capture clicks and close the menu 
          */}
          {isOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={toggleMenu}
              aria-hidden="true"
            />
          )}
        </div>
      </FocusTrap>
    </CSSTransition>
  );
};

export default MobileSideMenu;
