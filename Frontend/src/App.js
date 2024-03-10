import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
//import Home from './components/Home'; // Import your components
//import About from './components/About';
//import Services from './components/Services';
//import Contact from './components/Contact';
import MenuComponent from './components/MenuComponent'; // Incorrect if the folder is named 'components'

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <MenuComponent /> {/* Your cloud menu */}

      </div>
    </BrowserRouter>
  );
}

export default App;
