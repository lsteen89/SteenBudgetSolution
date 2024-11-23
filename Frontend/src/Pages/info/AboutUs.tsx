import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './AboutUs.module.css';
import FlipCard from '../../components/molecules/cards/FlipCard';
import SubmitButton from '../../components/atoms/buttons/SubmitButton';
import DeepBlueContainer from '../../components/molecules/containers/DeepBlueContainer';
const AboutUs: React.FC = () => {
  const navigate = useNavigate();

  const handleRedirect = () => {
    navigate('/registration');
  };

  return (
    <div className={styles.container}>
      {/* Cards Section */}
      <div className={styles.cardsContainer}>
        <FlipCard
          frontText="About eBudget"
          backText="Welcome to eBudget! This platform simplifies budget management and helps you take control of your finances."
        />
        <FlipCard
          frontText="Functions"
          backText="eBudget offers powerful tools like goal tracking, financial insights, and seamless budget management to empower you."
        />
        <FlipCard
          frontText="Placeholder"
          backText="Placeholder content for future functionality. Stay tuned for updates and exciting new features coming soon!"
        />
      </div>
      <div className={styles.mainPageTextContainer}>
        <DeepBlueContainer>
          {/* Lorem Ipsum Section */}
          <div className={styles.loremIpsum}>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            <p>Vestibulum et odio facilisis, auctor nisl ut, blandit velit.</p>
            <p>Proin in velit nec ipsum viverra convallis.</p>
          </div>
        </DeepBlueContainer>
        </div>

      {/* Submit Button */}
      <div className={styles.submitButton}>
        <SubmitButton
          isSubmitting={false}
          label="Skaffa eBudget!"
          size="large"
          onClick={handleRedirect}
        />
      </div>
    </div>
  );
};

export default AboutUs;
