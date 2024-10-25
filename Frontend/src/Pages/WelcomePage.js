import React, { useState } from 'react';
import './WelcomePage.css';
import RegBird from '../assets/Images/RegBird.png';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function WelcomePage() {
    const navigate = useNavigate();
    const [resendMessage, setResendMessage] = useState('');
    const [resendMessageType, setResendMessageType] = useState('');
    
    const handleLoginNavigation = () => {
        navigate('/login');  
    };

    const handleResendVerification = async () => {
        try {
            setResendMessage('Skickar verifieringslänk...');
            const response = await axios.post('/api/auth/resend-verification', { email: 'user@example.com' }); // Replace with dynamic email if available
            setResendMessage('En ny verifieringslänk har skickats. Kontrollera din e-post.');
        } catch (error) {
            if (error.response && error.response.status === 429) {
                setResendMessage('Vänligen vänta några minuter innan du försöker igen.');
            } else {
                setResendMessage('Det gick inte att skicka verifieringslänken. Försök igen senare.');
            }
        }
    };

    return (
        <div className="registration-container">
            <p className="CreateAccountText">Välkommen till eBudget</p>
            <div className="user-info-form">
                <div className="form-fields">
                    {/* Content for Welcome Page */}
                    <div className="rectangle-container">
                        <p>För att slutföra din registrering, vänligen verifiera din e-postadress genom att klicka på länken som vi precis har skickat till din mailadress. Om du inte ser e-posten inom några minuter, vänligen kontrollera din skräppostmapp.</p>
                    </div>
                    {/* Clickable resend verification link */}
                    <p>
                    <u className="resend-link" onClick={handleResendVerification} style={{ cursor: 'pointer' }}>
                        Klicka här för att skicka en ny verifieringslänk.
                    </u><br />
                    (Om du inte kan se e-posten eller har problem med att hitta den)
                </p>
                    {resendMessage && <p className="resend-message">{resendMessage}</p>}
                    <p><br /><br />Om du har några frågor eller behöver hjälp, tveka inte att kontakta vår support på support@ebudget.se.</p>
                </div>
            </div>
            <div className="form-submit">
                <button onClick={handleLoginNavigation}>Logga in!</button>
            </div>
            <img src={RegBird} alt="RegBird" className="reg-bird-image" />
        </div>
    );
}

export default WelcomePage;
