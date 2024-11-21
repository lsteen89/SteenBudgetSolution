import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';
import MainPageBird from '../../assets/Images/MainPageBird.svg';
import SubmitButton from '../../components/atoms/buttons/SubmitButton'; 

const HomePage = () => {
  let navigate = useNavigate(); 
  const handleRedirect = () => {
    navigate('/Registration');
  };
  return (
    <div className={styles.contentWrapper}>
      <div className={styles.MainPageTextContainer}>
        <p>
          Ta kontroll <br></br>över din <br></br>ekonomi och <br></br>skapa <br></br>trygghet för<br></br> framtiden <br></br>genom smart <br></br>budgetering!
        </p>
      </div>
      <div className={styles.buttonWrapper}>
        <SubmitButton isSubmitting={false} label="Skaffa eBudget!" size="large" onClick={handleRedirect} />
      </div>
      <div className={styles.imageWrapper}>
        <img src={MainPageBird} alt="Bird" className={styles.mainPageBird} />
      </div>
    </div>
  );
};

export default HomePage;
