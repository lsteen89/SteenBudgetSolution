import React from 'react';
import { ReactComponent as CloudMenu } from '../../../assets/Images/CloudMenu_1440.svg';
import styles from './MenuComponent.module.css';

const MenuComponent = () => {
  return (
    <div className={styles.cloudMenuContainer}>
      <CloudMenu className={styles.menuSvg} />
    </div>
  );
};

export default MenuComponent;
