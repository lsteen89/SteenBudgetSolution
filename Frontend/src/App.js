import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/HomePage';
import MenuComponent from './components/MenuComponent';
import Registration from './Pages/Registration';
import WelcomePage from './Pages/WelcomePage';
import AboutUs from './Pages/AboutUs';
import Contact from './Pages/Contact';
import Faq from './Pages/Faq';
import Login from './Pages/Login';
import EmailVerification from './Pages/EmailVerification';  

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <MenuComponent />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/welcomepage" element={<WelcomePage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} /> {}
          <Route path="/login" element={<Login />} /> {}
          <Route path="/verify-email" element={<EmailVerification />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
