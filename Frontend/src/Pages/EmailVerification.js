import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axiosConfig';  // Import your configured Axios instance


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

    const verifyEmail = async () => {
      try {
        // Use full URL based on environment
        const response = await axios.get(`${API_BASE_URL}/api/Registration/verify-email?token=${token}`);
        setStatusMessage('Email verified successfully!');
      } catch (error) {
        setStatusMessage('Invalid or expired token.');
      }
    };

    verifyEmail();
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
