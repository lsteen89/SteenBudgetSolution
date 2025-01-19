import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, CogIcon, ChartBarIcon, CurrencyDollarIcon, ChartPieIcon , ShieldCheckIcon } from '@heroicons/react/24/outline';
interface NavigationMenuProps {
  onLinkClick?: () => void;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({ onLinkClick }) => {
  return (
<nav className="flex-1 px-10 lg:px-5 flex-grow">
  <ul>
    {/* Manage Budget */}
    <li className="mb-4">
      <NavLink
        to="/manage-budget"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <HomeIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Målsättning
        </span>
      </NavLink>
    </li>

    {/* Settings */}
    <li className="mb-4">
      <NavLink
        to="/settings"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <CogIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Utgiftsspårning
        </span>
      </NavLink>
    </li>

    {/* Reports */}
    <li className="mb-4">
      <NavLink
        to="/reports"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <ChartBarIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Inkomstspårning
        </span>
      </NavLink>
    </li>

    {/* Savings Tracking */}
    <li className="mb-4 border-t border-gray-300 pt-4">
      <NavLink
        to="/savings-tracking"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <CurrencyDollarIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Sparandespårning
        </span>
      </NavLink>
    </li>

    {/* Scenario Planning */}
    <li className="mb-4">
      <NavLink
        to="/scenario-planning"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <ChartPieIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Scenarioplanering
        </span>
      </NavLink>
    </li>

    {/* Emergency Fund */}
    <li>
      <NavLink
        to="/emergency-fund"
        className={({ isActive }) =>
          `group flex items-center text-lg font-semibold transition-transform duration-300 ${
            isActive
              ? 'text-blue-500 scale-105'
              : 'text-black hover:text-darkLimeGreen hover:scale-110'
          }`
        }
        onClick={onLinkClick}
      >
        <ShieldCheckIcon className="h-6 w-6 mr-3 transition-none" />
        <span className="group-hover:scale-110 group-hover:text-darkLimeGreen transition-transform duration-300">
          Nödfond
        </span>
      </NavLink>
    </li>
  </ul>
</nav>

  );
};

export default NavigationMenu;
