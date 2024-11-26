/// <reference types="vite-plugin-svgr/client" />
import React from 'react';
import CloudMenu from '../../../assets/Images/CloudMenu_1440.svg?react';

const MenuComponent: React.FC = () => {
  return (
    <div
      className="
        fixed top-0 left-0 w-full h-[100px] z-[1000] bg-white 
        flex justify-center items-center shadow-md
      "
    >
      <CloudMenu
        className="
          w-[80vw] max-w-[1400px] h-[220px] mt-[100px] 
          md:h-[160px] md:mt-[80px] 
          xl:h-[220px] xl:mt-[100px]
        "
      />
    </div>
  );
};

export default MenuComponent;
