import React, { useState, useRef } from 'react';
import './Registration.module.css';
import RegBird from '../../assets/Images/RegBird.png';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../api/Services/User/registerUser';
import ReCAPTCHA from 'react-google-recaptcha';
import SubmitButton from '../../components/atoms/buttons/SubmitButton';
import InputField from '../../components/atoms/InputField/InputField';

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
    const [formData, setFormData] = useState<UserCreationDto>({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        captchaToken: '',
    });
    const [repeatEmail, setRepeatEmail] = useState<string>('');
    const [repeatPassword, setRepeatPassword] = useState<string>('');
    const [errors, setErrors] = useState<ErrorState>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const captchaRef = useRef<ReCAPTCHA>(null);
    const navigate = useNavigate();

    // Field validation logic
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
                else if (value !== formData.email) error = 'E-poster matchar inte!';
                break;

            case 'password':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value.length > 100) error = 'Lösenordet kan inte vara längre än 100 tecken!';
                else if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[\W]).{8,}$/.test(value)) error = 'Lösenordet måste ha minst en stor bokstav, en siffra och en symbol!';
                break;

            case 'repeatPassword':
                if (!value) error = 'Detta fältet är obligatoriskt!';
                else if (value !== formData.password) error = 'Lösenord matchar inte!';
                break;
        }
        return error;
    };

    // Handle input changes for form fields
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;

        if (name === 'repeatEmail') {
            setRepeatEmail(value);
        } else if (name === 'repeatPassword') {
            setRepeatPassword(value);
        } else {
            setFormData((prevData) => ({ ...prevData, [name]: value }));
        }
    };

    // Validate fields on blur
    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setErrors((errors) => ({ ...errors, [name]: validateField(name, value) }));
    };

    // Handle reCAPTCHA change
    const handleCaptchaChange = (token: string | null) => {
        setFormData((prevData) => ({ ...prevData, captchaToken: token || '' }));
    };

    // Handle form submission
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const fieldNames = ['firstName', 'lastName', 'email', 'repeatEmail', 'password', 'repeatPassword'];
        const validationErrors = fieldNames.reduce((acc, fieldName) => {
            const value = fieldName === 'repeatEmail' ? repeatEmail : 
                          fieldName === 'repeatPassword' ? repeatPassword : 
                          formData[fieldName as keyof UserCreationDto];
            acc[fieldName as keyof ErrorState] = validateField(fieldName, value);
            return acc;
        }, {} as ErrorState);

        if (!formData.captchaToken) {
            validationErrors.captcha = "Please verify you're not a robot.";
        }

        // Check if there are any errors
        if (Object.values(validationErrors).some((error) => error)) {
            setErrors(validationErrors);
            return;
        }

        const user: UserCreationDto = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password,
            captchaToken: formData.captchaToken,
        };

        setIsSubmitting(true);
        try {
            await registerUser(user);
            console.log('Registration successful');
            navigate('/check-email');
        } catch (error: any) {
            setErrors((prev) => ({ ...prev, form: error.message }));
            captchaRef.current?.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="registration-container">
            <h2>Register for eBudget</h2>
            <form onSubmit={handleSubmit} className="registration-form">
                <InputField
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    onBlur={handleBlur}
                    error={errors.firstName}
                    placeholder="First Name"
                />
                <InputField
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    onBlur={handleBlur}
                    error={errors.lastName}
                    placeholder="Last Name"
                />
                <InputField
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    onBlur={handleBlur}
                    error={errors.email}
                    placeholder="Email"
                />
                <InputField
                    type="email"
                    name="repeatEmail"
                    value={repeatEmail}
                    onChange={(e) => setRepeatEmail(e.target.value)}
                    onBlur={handleBlur}
                    error={errors.repeatEmail}
                    placeholder="Repeat Email"
                />
                <InputField
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    onBlur={handleBlur}
                    error={errors.password}
                    placeholder="Password"
                />
                <InputField
                    type="password"
                    name="repeatPassword"
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                    onBlur={handleBlur}
                    error={errors.repeatPassword}
                    placeholder="Repeat Password"
                />

                {errors.captcha && <div className="error-message">{errors.captcha}</div>}
                {errors.form && <div className="error-message form-error">{errors.form}</div>}

                <div className="form-submit">
                <SubmitButton isSubmitting={isSubmitting} label="Submit" type="submit" style={{ width: '250px' }} />
                
                <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || ''}
                    onChange={(token) => setFormData({ ...formData, captchaToken: token || '' })}
                    ref={captchaRef}
                />
                </div>
            </form>
        </div>
    );
};

export default RegistrationForm;
