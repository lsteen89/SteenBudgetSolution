import React from 'react';
import './MainContent.css';
import GreenButton from './GreenButton';

const MainContent = () => {
  return (
    <div className="main-content">
      <div className="info-section">
        <h1>Ta kontroll över din ekonomi och skapa trygghet för framtiden genom smart budgetering!</h1>
        <GreenButton />
      </div>
      {/* Placeholder for image */}
      <div className="image-placeholder"></div>
    </div>
  );
};

export default MainContent;
