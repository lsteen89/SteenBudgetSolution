import React from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as MenuSvg } from '../assets/Images/CloudMenu.svg';
import './MenuComponent.css'; // Keep CSS here

const MenuComponent = () => {
  return (
    <div className="cloud-menu-container">
      <MenuSvg className="menuSvg" />
      <Link to="/about-us" className="button om-oss">Om oss</Link>
      <Link to="/contact" className="button kontakt">Kontakt</Link>
      <Link to="/faq" className="button vanliga-fragor">Vanliga frågor</Link>
      <Link to="/login" className="button logga-in">Logga in</Link>
      {/* Adjust the className for styling in CSS */}
    </div>
  );
};

export default MenuComponent;
