import React from 'react';
import './CloudMenu.css'; // Make sure you have this CSS file in your src directory

const CloudMenu = () => {
  return (
    <div className="cloud-menu">
      <div className="logo">eBudget</div>
      <ul className="menu-items">
        <li><a href="#about" className="menu-item">Om eBudget</a></li>
        <li><a href="#faq" className="menu-item">Vanliga frågor</a></li>
        <li><a href="#contact" className="menu-item">Kontakt</a></li>
        <li><a href="#login" className="menu-item">Logga in</a></li>
      </ul>
      <div className="cloud-bump"></div>
      <div className="cloud-bump"></div>
      <div className="cloud-bump"></div>
      <div className="cloud-bump"></div>
      <div className="cloud-bump"></div>
      {/* Add more bumps as necessary */}
    </div>
  );
};

export default CloudMenu;
