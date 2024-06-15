import React from 'react';
import './Login.css';

const Login = () => {
  return (
    <div className="login-container">
      <form className="user-info-form">
        <h1>Logga in på eBudget</h1>
        <input type="text" placeholder="Epost" />
        <input type="password" placeholder="Password" />
        <input type="submit" value="Logga in" />
        <div className="additional-links">
          <a href="/forgotpassword" className="left-link">Glömt lösenord?</a>
          <a href="/Registration" className="right-link">Registrera dig</a>
        </div>
      </form>
    </div>
  );
};

export default Login;
