import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyEmail } from '../../api/Services/User/verifyEmail';
import DeepBlueContainer from '../../components/molecules/containers/DeepBlueContainer';
import SubmitButton from '../../components/atoms/buttons/SubmitButton';
import './EmailConfirmationPage.module.css'; 

const EmailConfirmationPage: React.FC = () => {
  const [statusMessage, setStatusMessage] = useState<string>('');
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token'); // Retrieve token from query parameter

  useEffect(() => {
    if (!token) {
      setStatusMessage('Felaktigt försök, försök igen eller kontakta oss!');
      return;
    }

    const handleEmailVerification = async () => {
      try {
        await verifyEmail(token);
        setStatusMessage('Tack för att du verifierade din e-postadress. Du kan nu logga in och börja använda tjänsten.');
      } catch (error: any) {
        setStatusMessage(error.message);
      }
    };

    handleEmailVerification();
  }, [token]);

  const handleRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="email-confirmation-container">
      <p className="CreateAccountText">Välkommen till eBudget</p>
      <DeepBlueContainer>
        <p>{statusMessage}</p>
      </DeepBlueContainer>
      {statusMessage === 'Tack för att du verifierade din e-postadress. Du kan nu logga in och börja använda tjänsten.' && (
        <SubmitButton isSubmitting={false} label="Logga in!" onClick={handleRedirect} />
      )}
    </div>
  );
};

export default EmailConfirmationPage;
