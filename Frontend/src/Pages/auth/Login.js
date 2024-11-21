import React, { useState } from 'react';
import './Login.module.css';
import SubmitButton from '../../components/atoms/buttons/SubmitButton'; 
const Login = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  return (
    <div className="login-container">
      <form className="user-info-form">
        <h1>Logga in på eBudget</h1>
        <input type="text" placeholder="Epost" />
        <input type="password" placeholder="Password" />
        <input type="submit" value="Logga in" />
  
  {/* Custom submit button */}
  <SubmitButton isSubmitting={isSubmitting} label="Skicka" type="submit" style={{ width: '250px' }} />
  
        
        <div className="additional-links">
          <a href="/forgotpassword" className="left-link">Glömt lösenord?</a>
          <a href="/Registration" className="right-link">Registrera dig</a>
        </div>
        <div><SubmitButton isSubmitting={isSubmitting} label="Skicka" type="submit" style={{ width: '250px' }} /></div>
      </form>
    </div>
  );
};

export default Login;
