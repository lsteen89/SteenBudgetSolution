import React from 'react';
import { ToastContentProps } from 'react-toastify';
import styles from './CustomToast.module.css';

interface CustomToastProps extends ToastContentProps {
  message?: string;
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
    const defaultMessage = type === 'error' ? 'Internt fel! Försök igen senare!' : 'Allt gick bra! :)';
  return (
    <div className={containerClass}>
      <div className={styles.toastContainer}>
      <div className={styles.toastMessage}>{message || defaultMessage}</div>
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
