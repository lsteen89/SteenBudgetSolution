import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ReactComponent as MenuSvgDefault } from '../assets/Images/CloudMenu.svg';
import './MenuComponent.css';

const MenuComponent = () => {
  const [MenuSvg, setMenuSvg] = useState(MenuSvgDefault);

  useEffect(() => {
    const updateSvg = () => {
      const screenWidth = window.innerWidth;
      if (screenWidth >= 1440) {
        import('../assets/Images/CloudMenu_1440.svg')
          .then(({ ReactComponent }) => {
            setMenuSvg(() => ReactComponent);
          })
          .catch(err => console.error('Failed to load SVG:', err));
      } else {
        setMenuSvg(MenuSvgDefault);
      }
    };

    // Call once and set up event listener on mount
    updateSvg();
    window.addEventListener('resize', updateSvg);

    // Cleanup listener on unmount
    return () => window.removeEventListener('resize', updateSvg);
  }, []);

  return (
    <div className="cloud-menu-container">
      <MenuSvg className="menuSvg" />
      <Link to="/about-us" className="button om-oss">Om oss</Link>
      <Link to="/contact" className="button kontakt">Kontakt</Link>
      <Link to="/faq" className="button vanliga-fragor">Vanliga frågor</Link>
      <Link to="/login" className="button logga-in">Logga in</Link>
    </div>
  );
};

export default MenuComponent;
