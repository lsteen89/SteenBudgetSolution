import React from 'react';
import IconButton from '../../atoms/buttons/IconButton';
import HomeIcon from '@components/atoms/icons/HomeIcon';

interface MobileSideMenuButtonContainerProps {
  toggleMenu: () => void;
  isDesktop: boolean;
}

const MobileSideMenuButtonContainer: React.FC<MobileSideMenuButtonContainerProps> = ({ toggleMenu, isDesktop }) => {
  return (
    <div className="flex  justify-center items-center mb-6  w-full">
      {/* Dashboard Button */}
      <div className="group flex hover:scale-110 transition-transform duration-300">
        <IconButton
          to="/dashboard"
          ariaLabel="Go to Dashboard"
          IconComponent={(props) => (
            <HomeIcon {...props} className="w-32 h-32 text-black hover:scale-110 hover:text-darkLimeGreen transition-transform duration-300" />
          )}

        />
      </div>

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
