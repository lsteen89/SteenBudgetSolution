import React, { useState, useRef } from 'react';
import './Registration.css';
import RegBird from '../assets/Images/RegBird.png';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/Services/User/registerUser';
import ReCAPTCHA from 'react-google-recaptcha';
import SubmitButton from '../components/buttons/SubmitButton';

// Define types for state
interface ErrorState {
    firstName?: string;
    lastName?: string;
    email?: string;
    repeatEmail?: string;
    password?: string;
    repeatPassword?: string;
    captcha?: string;
    form?: string;
}

// User data structure for registration
interface UserCreationDto {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    captchaToken: string;
}

const RegistrationForm: React.FC = () => {
    const [errors, setErrors] = useState<ErrorState>({});
    const [firstName, setFirstName] = useState<string>('');
    const [lastName, setLastName] = useState<string>('');
    const [email, setEmail] = useState<string>('');
    const [repeatEmail, setRepeatEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [repeatPassword, setRepeatPassword] = useState<string>('');
    const [captchaToken, setCaptchaToken] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const captchaRef = useRef<ReCAPTCHA>(null);
    const navigate = useNavigate();

    const validateField = (name: string, value: string): string => {
        let error = '';
        switch (name) {
            case 'firstName':
            case 'lastName':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value.length > 50) error = 'Kan inte vara längre än 50 tecken!';
                else if (!/^[\p{L}]+(([',.\s-][\p{L}])?\p{L}*)*$/u.test(value)) error = 'Ogiltigt format!';
                break;

            case 'email':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value.length > 100) error = 'E-mail kan inte vara längre än 100 tecken!';
                else if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(value)) error = 'Ogiltigt format!';
                break;

            case 'repeatEmail':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value !== email) error = 'E-poster matchar inte!';
                break;

            case 'password':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value.length > 100) error = 'Lösenordet kan inte vara längre än 100 tecken!';
                else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(value)) error = 'Lösenordet måste ha minst en stor bokstav, en siffra och en symbol!';
                break;

            case 'repeatPassword':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value !== password) error = 'Lösenord matchar inte!';
                break;
        }
        return error;
    };

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        switch (name) {
            case 'firstName': setFirstName(value); break;
            case 'lastName': setLastName(value); break;
            case 'email': setEmail(value); break;
            case 'repeatEmail': setRepeatEmail(value); break;
            case 'password': setPassword(value); break;
            case 'repeatPassword': setRepeatPassword(value); break;
        }
    };

    // Handle blur validation
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setErrors(errors => ({ ...errors, [name]: validateField(name, value) }));
    };

    const handleCaptchaChange = (token: string | null) => {
        setCaptchaToken(token);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const fieldNames = ['firstName', 'lastName', 'email', 'repeatEmail', 'password', 'repeatPassword'];
        
        if (!captchaToken) {
            setErrors(prev => ({ ...prev, captcha: "Please verify you're not a robot." }));
            return;
        }
    
        const validationErrors = fieldNames.reduce((acc, fieldName) => {
            const value = eval(fieldName);
            acc[fieldName as keyof ErrorState] = validateField(fieldName, value);
            return acc;
        }, {} as ErrorState);
    
        if (Object.values(validationErrors).some(error => error)) {
            setErrors(validationErrors);
            return;
        }
    
        const user: UserCreationDto = { firstName, lastName, email, password, captchaToken };
        setIsSubmitting(true);
    
        try {
            await registerUser(user);
            console.log('Registration successful');
            navigate('/welcomepage');
        } catch (error: any) {
            setErrors(prev => ({ ...prev, form: error.message }));
            captchaRef.current?.reset(); // Reset reCAPTCHA on failure
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="registration-container">
            <p className="CreateAccountText">Skapa konto för att komma igång med eBudget</p>
            <form onSubmit={handleSubmit} className="user-info-form">
                <div className="form-fields">
                    <input
                        type="text"
                        name="firstName"
                        value={firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.firstName ? 'input-error' : ''}`}
                        placeholder="Ange ditt förnamn.."
                    />
                    {errors.firstName && <div className="error-message">{errors.firstName}</div>}

                    <input
                        type="text"
                        name="lastName"
                        value={lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.lastName ? 'input-error' : ''}`}
                        placeholder="Ange ditt Efternamn.."
                    />
                    {errors.lastName && <div className="error-message">{errors.lastName}</div>}

                    <input
                        type="email"
                        name="email"
                        value={email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.email ? 'input-error' : ''}`}
                        placeholder="Ange din E-post.."
                    />
                    {errors.email && <div className="error-message">{errors.email}</div>}

                    <input
                        type="email"
                        name="repeatEmail"
                        value={repeatEmail}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.repeatEmail ? 'input-error' : ''}`}
                        placeholder="Upprepa e-post"
                    />
                    {errors.repeatEmail && <div className="error-message">{errors.repeatEmail}</div>}

                    <input
                        type="password"
                        name="password"
                        value={password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.password ? 'input-error' : ''}`}
                        placeholder="Välj lösenord, minst 8 tecken, en stor och en liten bokstav, minst ett specialtecken och minst en siffra."
                    />
                    {errors.password && <div className="error-message">{errors.password}</div>}

                    <input
                        type="password"
                        name="repeatPassword"
                        value={repeatPassword}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`input-style ${errors.repeatPassword ? 'input-error' : ''}`}
                        placeholder="Upprepa lösenord"
                    />
                    {errors.repeatPassword && <div className="error-message">{errors.repeatPassword}</div>}

                    {errors.email === "This email is already taken." && (
                        <div className="error-message">E-post redan tagen!</div>
                    )}

                    {errors.captcha && <div className="error-message">{errors.captcha}</div>}
                    {errors.form && <div className="error-message form-error">{errors.form}</div>}
                    
                    <div className="form-submit">
                    <SubmitButton isSubmitting={isSubmitting} label="Skicka" />
                        <ReCAPTCHA
                            sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY || ''}
                            onChange={handleCaptchaChange}
                            ref={captchaRef}
                        />
                    </div>
                </div>
                <img src={RegBird} alt="RegBird" className="reg-bird-image" />
            </form>
        </div>
    );
};

export default RegistrationForm;
