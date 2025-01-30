import React, { useEffect, useRef } from 'react';
import { CSSTransition } from 'react-transition-group';
import FocusTrap from 'focus-trap-react';
import NavigationMenu from './NavigationMenu';
import MobileSideMenuButtonContainer from '@components/molecules/containers/MobileSideMenuButtonContainer';
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';
import useMediaQuery from '@hooks/useMediaQuery';
import '@components/organisms/SlideMenu/slide-menu.css'; 
import { useAuth } from "@context/AuthProvider";

interface UserSideMenuProps {
    isOpen: boolean;
    toggleMenu: () => void;
}

const UserSideMenu: React.FC<UserSideMenuProps> = ({ isOpen, toggleMenu }) => {
  const isDesktop = useMediaQuery('(min-width: 1367px)');
  const nodeRef = useRef<HTMLDivElement>(null); // Internal ref
  console.log('Rendering UserSideMenu:', {
    isDesktop,
    isOpen,
    toggleMenu,
  });
  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (!isDesktop) {
      document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, isDesktop]);

  // Handle Esc key to close the menu
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
    <>
      {/* Desktop Sidebar */}
      {isDesktop && (
        <div
          id="user-side-menu-desktop" // Unique ID for desktop
          className="
            fixed 
            pt-5
            h-2/3
            top-48
            w-64 lg:min-w-60
            bg-standardMenuColor 
            text-white 
            shadow-none 
            z-50 
            opacity-100
            rounded-tr-2xl
            rounded-br-2xl
          "
        >
          <PageContainer className="relative pt-5" noPadding>
            <ContentWrapper className="flex flex-col" centerContent>
              
              {/* Button Container */}
              <MobileSideMenuButtonContainer toggleMenu={toggleMenu} isDesktop={isDesktop} />

              {/* Navigation Menu */}
              <NavigationMenu />
            </ContentWrapper>
          </PageContainer>
        </div>
      )}

      {/* Mobile & Tablet Menu */}
      {!isDesktop && (
        <CSSTransition
          in={isOpen}
          timeout={300}
          classNames="slide"
          unmountOnExit
          nodeRef={nodeRef}
        >
          <FocusTrap active={isOpen}>
            {/* Replace Fragment with a single div */}
            <div>
              <div
                ref={nodeRef}
                id="user-side-menu-mobile" // Unique ID for mobile
                className="
                  fixed top-32 md:top-32 left-0 
                  w-[70%] md:w-[40%]
                  bg-standardMenuColor 
                  text-white 
                  shadow-lg 
                  z-50 
                  h-3/4
                  rounded-tr-2xl 
                  rounded-br-2xl
                  opacity-90
                "
                aria-modal="true"
                role="dialog"
              >
                <PageContainer className="relative pt-5" noPadding>
                  <ContentWrapper className="flex flex-col h-full">
                    <div className="flex flex-col items-start justify-between flex-grow">
                      {/* Button Container */}
                      <MobileSideMenuButtonContainer toggleMenu={toggleMenu} isDesktop={false} />

                      {/* Navigation Menu */}
                      <NavigationMenu onLinkClick={toggleMenu} />
                    </div>
                  </ContentWrapper>
                </PageContainer>
              </div>

              {/* Overlay */}
              {isOpen && (
                <div
                  className="fixed inset-0 bg-black opacity-50 z-40"
                  onClick={toggleMenu}
                  aria-hidden="true"
                ></div>
              )}
            </div>
          </FocusTrap>
        </CSSTransition>
      )}
    </>
  );
};

export default UserSideMenu;
