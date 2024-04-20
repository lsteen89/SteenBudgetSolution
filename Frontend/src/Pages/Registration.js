import React, { useState } from 'react';
import './Registration.css';
import RegBird from '../assets/Images/RegBird.png';
import { useNavigate } from 'react-router-dom';  // Import useNavigate

function RegistrationForm() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [repeatEmail, setRepeatEmail] = useState('');
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [errors, setErrors] = useState({});

    const apiUrl = 'https://localhost:7224/Registration/register';
    const navigate = useNavigate();  

    const validateField = (name, value) => {
        let error = '';
        switch (name) {
            case 'firstName':
            case 'lastName':
                if (!value) error = 'This field is required.';
                else if (value.length > 50) error = 'Cannot be longer than 50 characters.';
                else if (!/^\p{L}+(([',. -]\p{L} )?\p{L}*)*$/u.test(value)) error = 'Invalid format.'; 
                break;
            case 'email':
                if (!value) error = 'Email is required.';
                else if (value.length > 100) error = 'E-mail cannot be longer than 100 characters.';
                else if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)) error = 'Invalid email format';
                break;
            case 'repeatEmail':
                if (!value) error = 'Email confirmation is required.';
                else if (value !== email) error = 'Emails do not match';
                break;
            case 'password':
                if (!value) error = 'Password is required.';
                else if (value.length > 100) error = 'Password cannot be longer than 100 characters.';
                else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(value)) error = 'Password must include at least one uppercase, one number, and one symbol.';
                break;
            case 'repeatPassword':
                if (!value) error = 'Password confirmation is required.';
                else if (value !== password) error = 'Passwords do not match';
                break;
        }
        return error;
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setErrors(errors => ({ ...errors, [name]: validateField(name, value) }));
        switch (name) {
            case 'firstName': setFirstName(value); break;
            case 'lastName': setLastName(value); break;
            case 'email': setEmail(value); break;
            case 'repeatEmail': setRepeatEmail(value); break;
            case 'password': setPassword(value); break;
            case 'repeatPassword': setRepeatPassword(value); break;
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const fieldNames = ['firstName', 'lastName', 'email', 'repeatEmail', 'password', 'repeatPassword'];
        const validationErrors = fieldNames.reduce((acc, fieldName) => {
            acc[fieldName] = validateField(fieldName, eval(fieldName));
            return acc;
        }, {});

        if (Object.values(validationErrors).some(error => error)) {
            setErrors(validationErrors);
            return;
        }

    // If all validations pass, submit data to server
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ firstName, lastName, email, password }),
        });

        if (response.ok) {
            console.log('Registration successful');
                navigate('/welcomepage'); 
        } else {
            const errorData = await response.json();
            console.error('Registration failed:', errorData);
            // Check if the error is about the email already taken
            if (errorData.message === "This email is already taken.") {
                setErrors(prev => ({ ...prev, email: 'This email is already taken.' }));
            } else {
                setErrors(prev => ({ ...prev, form: errorData.message }));
            }
        }
    } catch (error) {
        console.error('Error during registration:', error);
        setErrors({ form: 'An unexpected error occurred. Please try again.' });
    }
    };

    return (
        <div className="registration-container">
            <p className="CreateAccountText">Skapa konto för att komma igång med eBudget</p>
            <form onSubmit={handleSubmit} className="user-info-form">
                <div className="form-fields">
                    {/* Input for First Name */}
                    <div>
                        <input
                            type="text"
                            name="firstName"
                            value={firstName}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.firstName ? 'input-error' : ''}`}
                            placeholder="Ange ditt förnamn.."
                        />
                        {errors.firstName && <div className="error-message">{errors.firstName}</div>}
                    </div>
                    {/* Input for Last Name */}
                    <div>
                        <input
                            type="text"
                            name="lastName"
                            value={lastName}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.lastName ? 'input-error' : ''}`}
                            placeholder="Ange ditt Efternamn.."
                        />
                        {errors.lastName && <div className="error-message">{errors.lastName}</div>}
                    </div>
                    {/* Input for Email */}
                    <div>
                        <input
                            type="email"
                            name="email"
                            value={email}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.email ? 'input-error' : ''}`}
                            placeholder="Ange din E-post.."
                        />
                        {errors.email && <div className="error-message">{errors.email}</div>}
                    </div>
                    {/* Input for Repeat Email */}
                    <div>
                        <input
                            type="email"
                            name="repeatEmail"
                            value={repeatEmail}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.repeatEmail ? 'input-error' : ''}`}
                            placeholder="Upprepa e-post"
                        />
                        {errors.repeatEmail && <div className="error-message">{errors.repeatEmail}</div>}
                    </div>
                    {/* Input for Password */}
                    <div>
                        <input
                            type="password"
                            name="password"
                            value={password}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.password ? 'input-error' : ''}`}
                            placeholder="Välj löseord, minst 8 tecken, en stor och en liten bokstav, minst ett specialtecken och minst en siffra."
                        />
                        {errors.password && <div className="error-message">{errors.password}</div>}
                    </div>
                    {/* Input for Repeat Password */}
                    <div>
                        <input
                            type="password"
                            name="repeatPassword"
                            value={repeatPassword}
                            onChange={handleChange} // Updated to handle change for validation
                            className={`input-style ${errors.repeatPassword ? 'input-error' : ''}`}
                            placeholder="Upprepa löseord"
                        />
                        {errors.repeatPassword && <div className="error-message">{errors.repeatPassword}</div>}
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
