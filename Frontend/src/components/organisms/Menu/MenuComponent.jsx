/// <reference types="vite-plugin-svgr/client" />
import React from 'react';
import CloudMenu from '../../../assets/Images/CloudMenu_1440.svg?react';
import styles from './MenuComponent.module.css';

const MenuComponent = () => {
  return (
    <div className={styles.cloudMenuContainer}>
      <CloudMenu className={styles.menuSvg} />
    </div>
  );
};

export default MenuComponent;
