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

    const [touched, setTouched] = useState({
        firstName: false,
        lastName: false,
        email: false,
        repeatEmail: false,
        password: false,
        repeatPassword: false,
      });

  

    const apiUrl = 'https://localhost:7224/Registration/register'; 




    const validateEmail = (email) => {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    };

    const handleBlur = (fieldName) => {
        setTouched(prev => ({ ...prev, [fieldName]: true }));
      };
      const fieldValues = { firstName, lastName, email, repeatEmail, password, repeatPassword };

      const getErrorState = (fieldName) => touched[fieldName] && !fieldValues[fieldName];
      console.log(getErrorState('firstName'));
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateEmail(email)) {
            alert("Vänligen ange en giltig e-postadress.");
            return;
        }
        if (email !== repeatEmail) {
            alert("E-postadresserna matchar inte.");
            return;
        }
        if (password !== repeatPassword) {
            alert("Lösenorden matchar inte.");
            return;
        }
    
        // Define the payload here to use the latest state values
        const payload = { firstName, lastName, email, password };
    
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
    
            if (response.ok) {
                // Handle success
                console.log('Registration successful');
            } else {
                // Handle errors
                console.error('Registration failed');
            }
        } catch (error) {
            console.error('Error during registration:', error);
        }
    };

    return (
        
    <div className="registration-container">
        <p className="CreateAccountText">Skapa konto för att komma igång med eBudget</p>
                <form onSubmit={handleSubmit} className="user-info-form">
                    <div className="form-fields">
                        <div>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                onBlur={() => handleBlur('firstName')}
                                className={`input-style ${getErrorState('firstName') ? 'input-error' : ''}`}
                                placeholder="Ange ditt förnamn.."
                            />
                        </div>
                        <div>
                            <input 
                                type="text" 
                                value={lastName} 
                                onChange={(e) => setLastName(e.target.value)}
                                onBlur={() => handleBlur('lastName')}
                                className={`input-style ${getErrorState('lastName') ? 'input-error' : ''}`}       
                                placeholder="Ange ditt Efternamn.."
                            />
                        </div>
                        <div>
                            <input  
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)}
                                onBlur={() => handleBlur('email')}
                                className={`input-style ${getErrorState('email') ? 'input-error' : ''}`}
                                placeholder="Ange din E-post.."
                            />
                        </div>
                        <div>
                            <input 
                                type="email" 
                                value={repeatEmail} 
                                onChange={(e) => setRepeatEmail(e.target.value)}
                                onBlur={() => handleBlur('repeatEmail')}
                                className={`input-style ${getErrorState('repeatEmail') ? 'input-error' : ''}`}
                                placeholder="Upprepa e-post"
                            />
                        </div>
                        <div>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)}
                                onBlur={() => handleBlur('password')}
                                className={`input-style ${getErrorState('password') ? 'input-error' : ''}`}
                                placeholder="Välj löseord, minst 6 tecken."
                            />                            
                        </div>
                        <div>
                            <input 
                                type="password" 
                                value={repeatPassword} 
                                onChange={(e) => setRepeatPassword(e.target.value)}
                                onBlur={() => handleBlur('repeatPassword')}
                                className={`input-style ${getErrorState('repeatPassword') ? 'input-error' : ''}`}
                                placeholder="Upprepa löseord"
                            />         
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
