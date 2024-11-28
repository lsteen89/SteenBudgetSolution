import React from 'react';
import { ToastContentProps } from 'react-toastify';
import styles from './CustomToast.module.css';

interface CustomToastProps extends ToastContentProps {
  message: string;
  type: 'success' | 'error';
}

const CustomToast: React.FC<CustomToastProps> = ({
  closeToast,
  message,
  type,
}) => {
  const containerClass =
    type === 'success'
      ? styles.toastifyContainerSuccess
      : styles.toastifyContainerError;

  return (
    <div className={containerClass}>
      <div className={styles.toastContainer}>
        <div className={styles.toastMessage}>{message}</div>
        <button
          onClick={closeToast}
          className={styles.toastCloseButton}
          aria-label="Close"
        >
          ✖
        </button>
      </div>
    </div>
  );
};

export default CustomToast;
