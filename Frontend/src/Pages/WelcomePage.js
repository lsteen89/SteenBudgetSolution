import React, { useState } from 'react';
import './WelcomePage.css';
import RegBird from '../assets/Images/RegBird.png';
import { useNavigate } from 'react-router-dom';
import { resendVerificationEmail } from '../api/Services/User/resendVerificationEmail';

function WelcomePage() {
    const navigate = useNavigate();
    const [resendMessage, setResendMessage] = useState('');
    const [resendMessageType, setResendMessageType] = useState('');
    const [showInputBox, setShowInputBox] = useState(false);
    const [email, setEmail] = useState('');

    const handleResendClick = () => {
        setShowInputBox((prevState) => !prevState); // Toggle visibility
        setResendMessage(''); // Clear any previous messages when toggling
    };

    const handleLoginNavigation = () => {
        navigate('/login');  
    };

    const handleResendVerification = async () => {
        setResendMessage('Skickar verifieringslänk...');
    
        // Call the API function and get the status and message from the response
        const { status, message } = await resendVerificationEmail(email);
    
        // Check response to show the appropriate message based on status
        if (status === 200) {
            setResendMessage('En ny verifieringslänk har skickats. Kontrollera din e-post.');
            setResendMessageType('success');
        } else if (status === 429) {
            setResendMessage('Vänligen vänta några minuter innan du försöker igen.');
            setResendMessageType('error');
        } else {
            setResendMessage(message || 'Det gick inte att skicka verifieringslänken. Försök igen senare.');
            setResendMessageType('error');
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
                        <u className="resend-link" onClick={handleResendClick} style={{ cursor: 'pointer' }}>
                            Klicka här för att skicka en ny verifieringslänk.
                        </u><br />
                        (Om du inte kan se e-posten eller har problem med att hitta den)
                    </p>

                    {/* Conditional rendering for email input box */}
                    {showInputBox && (
                        <div className="email-input-box">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Ange din e-postadress"
                                required
                            />
                            <button onClick={handleResendVerification}>Skicka ny verifieringslänk</button>
                        </div>
                    )}

                    {/* Display resend message */}
                    {resendMessage && (
                        <p className={`resend-message ${resendMessageType}`}>
                            {resendMessage}
                        </p>
                    )}

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
