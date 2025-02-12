import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; 
import './index.css';

// Dynamically calculate and set --vh for mobile browsers
const setVh = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  document.documentElement.classList.add('vh-updated'); // Add a class for will-change
};

// Ensure it runs after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setVh();
  // Update on resize
  window.addEventListener('resize', setVh);
  // Update on orientation change
  window.addEventListener('orientationchange', setVh);
});

// Debugging - log the calculated vh value
const debugVh = () => {
  const vh = window.innerHeight * 0.01;
  console.log(`Viewport height: ${vh}px`);
};
window.addEventListener('resize', debugVh);
window.addEventListener('orientationchange', debugVh);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
