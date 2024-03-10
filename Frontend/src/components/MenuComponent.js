import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as MenuSvg } from '../assets/Images/CloudMenu.svg'; // Adjust the path as needed
import './MenuComponent.css'; // Assuming you have a CSS file for styles

const MenuComponent = () => {
  return (
    <div className="cloud-menu-container">
      <MenuSvg className="menuSvg" />
      <Link to="/" className="button" style={{ top: '60%', left: '47%' }}>Om oss</Link>
      <Link to="/about" className="button" style={{ top: '60%', left: '60%' }}>Kontakt</Link>
      <Link to="/about" className="button" style={{ top: '60%', left: '75%' }}>Vanliga frågor</Link>
      <Link to="/about" className="button" style={{ top: '60%', left: '90%' }}>Logga in</Link>
      {/* Add more Link components as needed for other menu items */}
    </div>
  );
};

export default MenuComponent;
