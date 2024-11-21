// SubmitButton.tsx
import React from 'react';
import styles from './SubmitButton.module.css';

interface SubmitButtonProps {
  isSubmitting: boolean;
  label?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
  size?: 'small' | 'large' | 'default'; // Add size prop
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  label = 'Submit',
  onClick,
  style,
  type = 'button',
  size = 'default', // Default size
}) => {
  return (
    <button
      type={type}
      disabled={isSubmitting}
      onClick={onClick}
      className={`${styles['submit-button']} ${styles[size]} ${
        isSubmitting ? styles.disabled : ''
      }`} // Dynamic classes for styles and size
      style={style}
    >
      {isSubmitting ? <div className={styles.spinner}></div> : label}
    </button>
  );
};

export default SubmitButton;
