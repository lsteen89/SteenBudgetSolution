import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import MainPageBird from '../assets/Images/MainPageBird.svg';

const HomePage = () => {
  let navigate = useNavigate(); // Hook to enable navigation

  return (
    <div className="MainPageWrapper">
      <div className="MainPageTextContainer">
        <p>
          Ta kontroll <br></br>över din <br></br>ekonomi och <br></br>skapa <br></br>trygghet för<br></br> framtiden <br></br>genom smart <br></br>budgetering!
        </p>
      </div>
      {/* Modified button to include onClick event for navigation */}
      <button className="Skaffa-Ebudget" onClick={() => navigate('/registration')}>Skaffa eBudget</button>
      <img src={MainPageBird} alt="Bird" className="main-page-bird" />
    </div>
  );
};

export default HomePage;
