import React from 'react';
import IconButton from '@components/atoms/buttons/IconButton';
import HomeIcon from '@components/atoms/icons/HomeIcon';

interface MobileSideMenuButtonContainerProps {
  toggleMenu: () => void;
}

const MobileSideMenuButtonContainer: React.FC<MobileSideMenuButtonContainerProps> = ({ toggleMenu }) => {
  return (
    <div className="flex justify-center items-center mb-6 px-4 pt-5 md:pt-10 w-full">


      {/* Spacer */}
      <div className="flex-grow"></div>

      {/* Close Button */}
      <IconButton
        onClick={toggleMenu}
        ariaLabel="Close Menu"
        iconText="✕"
        className="text-5xl font-bold w-10 h-10 flex"
      />
    </div>
  );
};

export default MobileSideMenuButtonContainer;
