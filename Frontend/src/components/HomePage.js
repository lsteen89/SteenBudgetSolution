import React from 'react';
import './HomePage.css';
import MainPageBird from '../assets/Images/MainPageBird.svg';

const HomePage = () => {
  return (
    <div className="MainPageWrapper">
      <div className="MainPageTextContainer">
        <p>
          Ta kontroll över din ekonomi och skapa trygghet för framtiden genom smart budgetering!
        </p>
      </div>
      <button className="Skaffa-Ebudget">Skaffa eBudget</button>
      <img src={MainPageBird} alt="Bird" style={{ marginTop: '10vh' }} />
    </div>
  );
};

export default HomePage;
