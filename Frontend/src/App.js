import React from 'react';
import { ReactComponent as MenuSvg } from './assets/Images/CloudMenu.svg';
import './App.css'; // Make sure your CSS file is correctly imported

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="svg-container">
          <MenuSvg className="menuSvg" />
        </div>
        {/* Other header content */}
      </header>
      {/* Rest of your application content */}
    </div>
  );
}

export default App;
