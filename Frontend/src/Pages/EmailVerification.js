import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyEmail } from '../api/auth/authApi'; 

const EmailVerification = () => {
  const [statusMessage, setStatusMessage] = useState('');
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');  // Get token from query parameter

  useEffect(() => {
    if (!token) {
      setStatusMessage('No token provided. This is a test page.');
      return;
    }

    const handleEmailVerification = async () => {
      try {
        await verifyEmail(token); // Use the imported function
        setStatusMessage('Email verified successfully!');
      } catch (error) {
        setStatusMessage(error.message); // Show error message
      }
    };

    handleEmailVerification();
  }, [token]);

  const handleRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="email-verification-container">
      <h1>Email Verification</h1>
      <p>{statusMessage}</p>
      {statusMessage === 'Email verified successfully!' && (
        <button onClick={handleRedirect}>Go to Login</button>
      )}
    </div>
  );
};

export default EmailVerification;
