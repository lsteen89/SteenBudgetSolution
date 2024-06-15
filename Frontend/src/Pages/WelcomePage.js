import React from 'react';
import './WelcomePage.css';
import RegBird from '../assets/Images/RegBird.png';

function WelcomePage() {
    return (
        <div className="registration-container">
            <p className="CreateAccountText">Välkommen till eBudget</p>
            <div className="user-info-form">
                <div className="form-fields">
                    {/* Content for Welcome Page */}
                    <div className="rectangle-container">
                        <p>För att slutföra din registrering, vänligen verifiera din e-postadress genom att klicka på länken som vi precis har skickat till din mailadress. Om du inte ser e-posten inom några minuter, vänligen kontrollera din skräppostmapp.</p>
                    </div>
                    <p><u>Klicka här för att skicka en ny verifieringslänk.</u><br />(Om du inte kan se e-posten eller har problem med att hitta den)</p>
                    <p>Om du har några frågor eller behöver hjälp, tveka inte att kontakta vår support på support@ebudget.se.</p>
                </div>

            </div>
            <div className="form-submit">
                    <button>Logga in!</button>
                </div>
            <img src={RegBird} alt="RegBird" className="reg-bird-image" />
        </div>
    );
}

export default WelcomePage;
