import React, { useState } from 'react';
import './Registration.css';
import RegBird from '../assets/Images/RegBird.png';

function RegistrationForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [repeatEmail, setRepeatEmail] = useState(''); // New state for repeated email
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState(''); // New state for repeated password

    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validateEmail(email)) {
            alert("Please enter a valid email address.");
            return;
        }

        // Validation for repeated email and password
        if(email !== repeatEmail) {
            alert("Emails do not match.");
            return;
        }

        if(password !== repeatPassword) {
            alert("Passwords do not match.");
            return;
        }

        console.log(firstName, lastName, email, password);
    };

    return (
        
    <div className="registration-container">
        <p className="CreateAccountText">Skapa konto för att komma igång med eBudget</p>
                <form onSubmit={handleSubmit} className="user-info-form">
                    <div className="form-fields">
                        <div>
                            <label className="label-style">Förnamn:</label>
                            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-style">Efternamn:</label>
                            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-style">E-post:</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-style">Upprepa e-post:</label>
                            <input type="email" value={repeatEmail} onChange={(e) => setRepeatEmail(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-style">Lösenord:</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-style">Upprepa lösenord:</label>
                            <input type="password" value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
                        </div>
                        </div>
                    <div className="form-submit">
                        <button type="submit">Sätt igång!</button>

                    </div>
                </form>
                <img src={RegBird} alt="RegBird" className="reg-bird-image" />
    </div>
    );
}

export default RegistrationForm;
