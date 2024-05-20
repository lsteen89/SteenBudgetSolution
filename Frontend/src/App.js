import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import MenuComponent from './components/MenuComponent';
import Registration from './Pages/Registration';
import WelcomePage from './Pages/WelcomePage';
import AboutUs from './Pages/AboutUs'; // Import AboutUs component

// Uncomment and import other components as you add new routes/pages
// import Services from './components/Services';
// import Contact from './components/Contact';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        {/* MenuComponent will be visible on all pages */}
        <MenuComponent />
        <Routes>
          {/* Define the route for the HomePage as the main/starting page */}
          <Route path="/" element={<HomePage />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/welcomepage" element={<WelcomePage />} />
          <Route path="/about-us" element={<AboutUs />} /> {/* Add the AboutUs route */}
          {/* Future routes for other pages can be defined here */}
          {/* <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} /> */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
