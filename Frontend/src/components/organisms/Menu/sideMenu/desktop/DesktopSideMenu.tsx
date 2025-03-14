import React, { useEffect } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';
import DesktopSideMenuButtonContainer from '@components/organisms/Menu/sideMenu/desktop/DesktopSideMenuButtonContainer';
import NavigationMenu from '@components/organisms/Menu/sideMenu/NavigationMenu';

interface DesktopSideMenuProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

// Menu slide animation
const sideMenuVariants: Variants = {
  open: {
    x: '0%',
    transition: { type: 'tween', duration: 0.3 }
  },
  closed: {
    x: '-80%',
    transition: { type: 'tween', duration: 0.3 }
  }
};

// Arrow rotation animation
// We'll rotate from 0 to 180 degrees. 
// Alternatively, you can swap arrow text conditionally if you prefer, e.g. { isOpen ? '←' : '→' }
const arrowVariants: Variants = {
  open: { rotate: 180 },   // rotates 180° from its default orientation
  closed: { rotate: 0 }
};

const DesktopSideMenu: React.FC<DesktopSideMenuProps> = ({ isOpen, toggleMenu }) => {
  // Close menu on Escape key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        toggleMenu();
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, toggleMenu]);

  return (
    <motion.div
      id="user-side-menu-desktop"
      initial="closed"
      animate={isOpen ? 'open' : 'closed'}
      variants={sideMenuVariants}
      className={`
        fixed left-0 top-48  /* top-48 => 12rem */
        w-64 h-2/3
        rounded-tr-3xl rounded-br-3xl
        shadow-2xl
        border-r-4 border-customBlue2
        overflow-hidden
        z-50
        bg-gradient-to-b from-customBlue1 to-standardMenuColor
        transition-all
      `}
    >
      <PageContainer className="relative pt-5" noPadding>
        <ContentWrapper className="flex flex-col" centerContent>
          {/*<DesktopSideMenuButtonContainer toggleMenu={toggleMenu} />*/}
          <NavigationMenu />
        </ContentWrapper>
      </PageContainer>

      {/* Arrow toggle button */}
      <motion.button
        onClick={toggleMenu}
        className={`
          absolute
          -right-0 top-1/2
          transform -translate-y-1/2
          bg-black text-white
          w-8 h-8
          rounded-full
          flex items-center justify-center
          cursor-pointer
          transition-transform duration-200
          hover:scale-110 active:scale-95
          focus:outline-none
        `}
        aria-label="Toggle Menu"
        // Using Framer Motion for rotation
        initial={false}
        animate={isOpen ? 'open' : 'closed'}
        variants={arrowVariants}
      >
        {/* This is the arrow icon (→). It rotates 180° to become ← when open */}
        <motion.span
          className="inline-block"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem' // slightly bigger
          }}
        >
          →
        </motion.span>
      </motion.button>
    </motion.div>
  );
};

export default DesktopSideMenu;
