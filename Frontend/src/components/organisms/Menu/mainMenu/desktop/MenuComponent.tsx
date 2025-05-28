import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@hooks/auth/useAuth'; // Import the useAuth hook
import CloudMenu from '@assets/Components/Menu/CloudMenu_1440.svg?react';
import styles from './menu.module.css'; // Import CSS module
import MobileBird from '@assets/Images/MobileBird.png';
import useBreakpoint from '@hooks/useBreakpoint'; // Import the custom hook
import { MenuItem, Breakpoint } from '@components/organisms/Menu/mainMenu/desktop/types'; // Import types
const MenuComponent: React.FC = () => {
  const auth = useAuth();
  const breakpoint: Breakpoint = useBreakpoint(); // Get current breakpoint

  // Unified menu items data with responsive positions
  const menuItems: MenuItem[] = [
    {
      id: 1,
      type: 'button',
      label: "eBudget",
      path: "/",
      positions: {
        lg: { left: 45.5, top: 60 },
        xl: { left: 16.5, top: 70 },
        "2xl": { left: 16.5, top: 60 },
        "3xl": { left: 28, top: 60 },
      },
    },
    // Icon Menu Item: MobileBird (Placed between eBudget and Om oss)
    {
      id: 6,
      type: 'icon',
      path: "/mobile-bird", 
      positions: {
        lg: { left: 47, top: 60 },    // Positioned between eBudget (14%) and Om oss (48%)
        xl: { left: 30.5, top: 40 },     // Positioned between eBudget (14%) and Om oss (48%)
        "2xl": { left: 30.5, top: 40 },   // Positioned between eBudget (41.5%) and Om oss (48.5%)
        "3xl": { left: 37.5, top: 40 }, // Positioned between eBudget (42%) and Om oss (49%)
      },
      icon: (
        <img src={MobileBird} alt="Mobile Bird" className="w-[90px] h-auto" />
      ),
    },
    {
      id: 2,
      type: 'button',
      label: "Om oss",
      path: "/about-us",
      // Removed hasMobileBird: true
      positions: {
        lg: { left: 47.5, top: 60 },
        xl: { left: 44, top: 70 },
        "2xl": { left: 44, top: 60 },
        "3xl": { left: 46, top: 60 },
      },
    },
    {
      id: 3,
      type: 'button',
      label: "Kontakt",
      path: "/contact",
      positions: {
        lg: { left: 54.3, top: 60 },
        xl: { left: 56.8, top: 70 },
        "2xl": { left: 56.8, top: 60 },
        "3xl": { left: 54.5, top: 60 },
      },
    },
    {
      id: 4,
      type: 'button',
      label: "Vanliga frågor",
      path: "/faq",
      positions: {
        lg: { left: 61, top: 60 },
        xl: { left: 69, top: 70 },
        "2xl": { left: 69, top: 60 },
        "3xl": { left: 62.5, top: 60 },
      },
    },
    {
      id: 5,
      type: 'button',
      label: auth?.authenticated ? "Logga ut" : "Logga in",
      path: auth?.authenticated ? "#" : "/login",
      isAuth: true,
      positions: {
        lg: { left: 66.8, top: 60 },
        xl: { left: 80.3, top: 70 },
        "2xl": { left: 80.3, top: 60 },
        "3xl": { left: 70, top: 60 },
      },
    },
  ];

  return (
    <header className="w-full z-[1000] fixed top-0 left-0 bg-white pt-10"> {/* Fixed header with bg-white and padding */}
      {/* Header bar */}
      <div className="h-[100px] flex items-center justify-center bg-white shadow-md">
        {/* Optional: Add logo or title here */}
      </div>

      {/* Cloud menu container */}
      <div className={`${styles.menuContainer} flex items-center justify-center z-20`}>
        {/* CloudMenu SVG */}
        <CloudMenu className={`${styles.cloudMenu} pointer-events-none z-20`} />

        {/* Menu Items Container */}
        {menuItems.map((item) => {
          if (item.type === 'button') {
            return (
              <div
                key={item.id}
                className={`${styles.buttonContainer}`}
                style={{ left: `${item.positions[breakpoint].left}%`, top: `${item.positions[breakpoint].top}px` }}
              >
                {/* Conditional Rendering for Auth Buttons */}
                {item.isAuth ? (
                  auth?.authenticated ? (
                    <button
                      onClick={(e) => { auth.logout(); }}
                      className={`${styles.cta}`}
                      aria-label="Logga ut"
                    >
                      <span>Logga ut</span>
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className={`${styles.cta}`}
                      aria-label="Logga in"
                    >
                      <span>Logga in</span>
                    </Link>
                  )
                ) : (
                  // Other Navigation Buttons
                  <Link
                    to={item.path ?? "#"}
                    className={`${styles.cta}`}
                    aria-label={item.label}
                  >
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            );
          } else if (item.type === 'icon') {
            return (
              <div
                key={item.id}
                className={`${styles.iconContainer}`}
                style={{ left: `${item.positions[breakpoint].left}%`, top: `${item.positions[breakpoint].top}px` }}
              >
                {/* Icon Menu Item */}
                <Link
                  to="/"
                  className={`${styles.iconButton} animate-img-pulse`}
                  aria-label="Mobile Bird"
                >
                  {item.icon}
                </Link>
              </div>
            );
          } else {
            return null;
          }
        })}
      </div>
    </header>
  );
};

export default MenuComponent;