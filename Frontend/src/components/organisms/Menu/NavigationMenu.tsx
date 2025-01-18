import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavigationMenuProps {
  onLinkClick?: () => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ onLinkClick }) => {
  return (
    <nav className="flex-1 px-10 lg:px-5">
      <ul>
        <li>
          <NavLink
            to="/manage-budget"
            className={({ isActive }) =>
              `text-lg font-medium transition-colors ${
                isActive ? 'text-blue-500' : 'text-black hover:text-gray-700'
              }`
            }
            onClick={onLinkClick}
          >
            Målsättning
          </NavLink>
        </li>
        <br />
        <li>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `text-lg font-medium transition-colors ${
                isActive ? 'text-blue-500' : 'text-black hover:text-gray-700'
              }`
            }
            onClick={onLinkClick}
          >
            Utgiftsspårning
          </NavLink>
        </li>
        <br />
        <li>
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              `text-lg font-medium transition-colors ${
                isActive ? 'text-blue-500' : 'text-black hover:text-gray-700'
              }`
            }
            onClick={onLinkClick}
          >
            Inkomstspårning
          </NavLink>
        </li>
        <br />
        <li>
          <button
            onClick={onLinkClick}
            className="text-lg font-medium text-black hover:text-gray-700 transition-colors"
          >
            Sparandespårning
          </button>
        </li>
        <br />
        <li>
          <button
            onClick={onLinkClick}
            className="text-lg font-medium text-black hover:text-gray-700 transition-colors"
          >
            Scenarioplanering
          </button>
        </li>
        <br />
        <li>
          <button
            onClick={onLinkClick}
            className="text-lg font-medium text-black hover:text-gray-700 transition-colors"
          >
            Nödfond
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default NavigationMenu;
