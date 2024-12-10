import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Pages/Home/HomePage';
import MenuComponent from './components/organisms/Menu/MenuComponent';
import Registration from './Pages/auth/Registration';
import CheckEmailPage from './Pages/auth/CheckEmailPage';
import AboutUs from './Pages/info/AboutUs';
import Contact from './Pages/info/Contact';
import Faq from './Pages/info/Faq';
import Login from './Pages/auth/Login';
import TestForm from './Pages/TestForm';
import EmailConfirmationPage from './Pages/auth/EmailConfirmationPage';  
import './index.css';
import { mockVerifyEmail } from '@mocks/mockServices/verifyEmailMock.ts';
import { verifyEmail as realVerifyEmail } from '@api/Services/User/verifyEmail';

function App() {

  const isDebugMode = process.env.NODE_ENV === 'development';
  return (
    <BrowserRouter>
      <div className="App">
        <MenuComponent />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/registration" element={<Registration />} />
          <Route path="/check-email" element={<CheckEmailPage />} /> {/* After registration */}
          <Route path="/email-confirmation" element={<EmailConfirmationPage
              verifyEmail={isDebugMode ? mockVerifyEmail : realVerifyEmail}
              debugToken={isDebugMode ? 'debug-token-123' : undefined}
              />
            }
          />;
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/login" element={<Login />} />
          <Route path="/testform" element={<TestForm />} />
          <Route path="*" element={<h1>404 - Page Not Found</h1>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
