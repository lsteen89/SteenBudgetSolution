import React from 'react';
import styles from './DeepBlueContainer.module.css';

const DeepBlueContainer = ({ children }) => {
  return <div className={styles['deep-blue-container']}>{children}</div>;
};

export default DeepBlueContainer;
