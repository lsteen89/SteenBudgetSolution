import React from 'react';
import IconButton from '../../atoms/buttons/IconButton';
import HomeIcon from '@assets/icons/HomeIcon.svg?react';

interface MobileSideMenuButtonContainerProps {
  toggleMenu: () => void;
  isDesktop: boolean;
}

const MobileSideMenuButtonContainer: React.FC<MobileSideMenuButtonContainerProps> = ({ toggleMenu, isDesktop }) => {
  return (
    <div className="flex justify-between items-center mb-6 px-4 w-full">
      {/* Dashboard Button */}
      <IconButton
        to="/dashboard"
        ariaLabel="Go to Dashboard"
        IconComponent={HomeIcon}
        className="hover:opacity-80 transition-opacity w-24 h-24" // 96px x 96px
      />

      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Close Button */}
      {!isDesktop && (
        <IconButton
          onClick={toggleMenu}
          ariaLabel="Close Menu"
          iconText="✕"
          className="text-5xl bg-black font-bold focus:outline-none focus:ring-2 focus:ring-white rounded-xl w-16 h-16 flex " // 64px x 64px
        />
      )}
    </div>
  );
};

export default MobileSideMenuButtonContainer;
