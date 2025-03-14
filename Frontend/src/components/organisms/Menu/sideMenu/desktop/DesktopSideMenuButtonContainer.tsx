import React from 'react';
import IconButton from '@components/atoms/buttons/IconButton';
import HomeIcon from '@components/atoms/icons/HomeIcon';

interface DesktopSideMenuButtonContainerProps {
  toggleMenu: () => void;
}

const DesktopSideMenuButtonContainer: React.FC<DesktopSideMenuButtonContainerProps> = ({ toggleMenu }) => {
  return (
    <div className="flex justify-center items-center mb-6 px-4 w-full">
      <div className="group flex hover:scale-110 transition-transform duration-300">
        <IconButton
          to="/dashboard"
          ariaLabel="Go to Dashboard"
          IconComponent={(props) => (
            <HomeIcon
              {...props}
              className="w-[80%] h-[80%] text-black hover:scale-110 hover:text-darkLimeGreen transition-transform duration-300"
            />
          )}
        />
      </div>
    </div>
  );
};

export default DesktopSideMenuButtonContainer;
