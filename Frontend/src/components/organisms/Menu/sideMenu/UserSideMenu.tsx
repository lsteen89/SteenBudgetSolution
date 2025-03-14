import React from 'react';
import useMediaQuery from '@hooks/useMediaQuery';
import DesktopSideMenu from '@components/organisms/Menu/sideMenu/desktop/DesktopSideMenu';
import MobileSideMenu from '@components/organisms/Menu/sideMenu/mobile/MobileSideMenu';

interface UserSideMenuProps {
  isOpen: boolean;
  toggleMenu: () => void;
}

const UserSideMenu: React.FC<UserSideMenuProps> = ({ isOpen, toggleMenu }) => {
  const isDesktop = useMediaQuery('(min-width: 1367px)');

  return (
    <>
      {isDesktop ? (
        <DesktopSideMenu isOpen={isOpen} toggleMenu={toggleMenu} />
      ) : (
        <MobileSideMenu isOpen={isOpen} toggleMenu={toggleMenu} />
      )}
    </>
  );
};

export default UserSideMenu;
