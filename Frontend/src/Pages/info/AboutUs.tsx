import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AboutUs.module.css'; 
import AboutUsBird from '../../assets/Images/AboutUsBird.png'; 
import SubmitButton from '../../components/atoms/buttons/SubmitButton';
import ReactCardFlip from 'react-card-flip';

const AboutUs: React.FC = () => {
  const navigate = useNavigate(); // Initialize the useNavigate hook
  const [activeSection, setActiveSection] = useState<string>('about'); // State to manage active section

  const handleButtonClick = () => {
    navigate('/registration'); // Navigate to the registration page
  };

  const renderContent = (): JSX.Element => {
    switch (activeSection) {
      case 'about':
        return (
          <p>
            Welcome to eBudget! This platform simplifies budget management and helps you take control of your finances.
          </p>
        );
      case 'functions':
        return (
          <p>
            eBudget offers powerful tools like goal tracking, financial insights, and seamless budget management to
            empower you.
          </p>
        );
      case 'placeholder':
        return (
          <p>
            Placeholder content for future functionality. Stay tuned for updates and exciting new features coming soon!
          </p>
        );
      default:
        return <p>Select a section to view its content.</p>;
    }
  };

  return (
    <div className={styles.container}>
      {/* Button Group */}
      <div className={styles.buttonGroup}>
        <button
          className={`${styles.button} ${activeSection === 'about' ? styles.active : ''}`}
          onClick={() => setActiveSection('about')}
        >
          About eBudget
        </button>
        <button
          className={`${styles.button} ${activeSection === 'functions' ? styles.active : ''}`}
          onClick={() => setActiveSection('functions')}
        >
          Functions
        </button>
        <button
          className={`${styles.button} ${activeSection === 'placeholder' ? styles.active : ''}`}
          onClick={() => setActiveSection('placeholder')}
        >
          Placeholder
        </button>
      </div>

      {/* Display Window */}
      <div className={styles.displayWindow}>{renderContent()}</div>

      {/* Registration Button */}
      <div className={styles.registration}>
        <button className={styles.registrationButton} onClick={handleButtonClick}>
          Testa gratis!
        </button>
      </div>
    </div>
  );
};

export default AboutUs;
