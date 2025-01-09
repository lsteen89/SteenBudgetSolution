import React, { useState, useRef } from 'react';
import FormContainer from '@components/molecules/containers/FormContainer';
import InputField from "@components/atoms/InputField/ContactFormInputField";
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import LoginBird from '@assets/Images/LoginBird.png';
import { useNavigate } from 'react-router-dom';
import { UserLoginValidator } from '@utils/validation/userLoginValidation';
import { UserLoginDto } from '../../types/userLoginForm';
import ReCAPTCHA from 'react-google-recaptcha';
import { login } from '@api/Services/User/auth';
type ReCAPTCHAWithReset = ReCAPTCHA & {
  reset: () => void;
};

const LoginPage: React.FC = () => {
  const captchaRef = useRef<ReCAPTCHAWithReset>(null);
  const [formData, setFormData] = useState<UserLoginDto>({ email: '', password: '', captchaToken: '' } );
  const [errors, setErrors] = useState<{ [key in keyof UserLoginDto]?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();

  const handleCaptchaChange = (token: string | null) => {
    setFormData((prevData) => ({
      ...prevData,
      captchaToken: token || '', 
    }));
  };
  const handleInputChange = (field: keyof UserLoginDto, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    // Optionally clear the error for this field
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: '', // Clear error for this field
    }));
  };


  const handleBlur = (field: keyof UserLoginDto) => {
    if (!formData[field]) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        [field]: `${field === 'email' ? 'E-post' : 'Lösenord'} måste anges!`,
      }));
    }
  };

  const validateForm = async (): Promise<boolean> => {
    setErrors({}); // Clear previous errors
    try {
      await UserLoginValidator.validate(formData, { abortEarly: false });
      return true;
    } catch (validationError: any) {
      const validationErrors: { [key in keyof UserLoginDto]?: string } = {};
      if (Array.isArray(validationError.inner)) {
        validationError.inner.forEach((err: any) => {
          validationErrors[err.path as keyof UserLoginDto] = err.message;
        });
      }
      console.error("Validation errors:", validationErrors);
      setErrors(validationErrors);
      return false;
    }
  };
  

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  
    // Validate the form before proceeding
    const isValid = await validateForm();
    if (!isValid) return;
  
    setErrors({}); // Clear any previous errors
    try {
      const result = await login(formData);
  
      if (result.success) {
        console.log("Login successful:", result.message);
        navigate("/dashboard");
      } else {
        setErrors({ form: result.message }); // Show backend error message
        // Reset the ReCAPTCHA when there’s an error
        if (captchaRef.current) {
          captchaRef.current.reset();
        }
      }
    } catch (error: any) {
      console.error("Login failed:", error.message);
      setErrors({ form: "Login misslyckades, försök igen!." }); // Generic error
      // Reset the ReCAPTCHA in case of any error
      if (captchaRef.current) {
        captchaRef.current.reset();
      }
    }
  };
  

  const handleForgotPassword = () => navigate('/forgotpassword');
  const handleRegister = () => navigate('/registration');

  return (
    
    <div className="
      relative 
      flex 
      justify-center 
      items-start 
      min-h-screen 
      py-12
      sm:items-center sm:py-6 
      md:py-12 
      lg:py-16 
      xl:py-20 
      2xl:py-24 
      3xl:py-32">
      <FormContainer tag="form" className='z-10' bgColor="gradient"onSubmit={handleSubmit}>
        {/* Title */}
        <p className="text-lg font-bold text-gray-800 mb-6 text-center">Välkommen tillbaka! Logga in för att fortsätta</p>

        {/* Email */}
        <div className="flex-1 mb-4">
          <label className="block text-gray-700 text-sm mb-2" htmlFor="email">
            E-postadress
          </label>
          <InputField
            placeholder="Ange din e-post"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
            width="100%"
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex-1 mb-4">
          <label className="block text-gray-700 text-sm mb-2" htmlFor="password">
            Lösenord
          </label>
          <InputField
            placeholder="Ange ditt lösenord"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
            width="100%"
          />
          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password}</p>
          )}

        </div>
        {errors.form && <p style={{ color: "red" }}>{errors.form}</p>}
        {/* Submit Button and ReCAPTCHA */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 items-center">
          {/* Submit Button */}
          <div className="flex-1 flex justify-center w-full sm:w-auto">
            <SubmitButton
              isSubmitting={isSubmitting}
              label="Logga in"
              type="submit"
              enhanceOnHover
              style={{ width: '100%' }}
            />
          </div>

          {/* ReCAPTCHA */}
          <div
            className="mt-4 sm:mt-0 flex justify-center w-full sm:w-auto"
            style={{
              transform: 'scale(0.9)',
              transformOrigin: 'center',
              height: '78px', // Typical height of the ReCAPTCHA widget when scaled
              overflow: 'hidden',
            }}
          >
            <ReCAPTCHA
              sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              ref={captchaRef}
            />
          </div>
        </div>

        {/* Error Message */}
        {errors.captchaToken && (
          <p className="text-red-500 text-sm text-center mt-2">{errors.captchaToken}</p>
        )}
        {/* Forgot Password and Register */}
        <div className="flex justify-between mt-4">
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Glömt lösenord?
          </button>
          <button
            type="button"
            onClick={handleRegister}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            Registrera
          </button>

        </div>
      </FormContainer>

      {/* Bird Image */}
      <img
        src={LoginBird}
        alt="LoginBird"
        className="
          absolute 
          transform translate-y-[10%] 
          w-auto max-w-[320px] 
          z-0
          iphone-se:iphone-se:top-[18%] iphone-se:max-w-[150px] /* Target iPhone SE */
          ipad:ipad:top-[70%] ipad:left-[35%] ipad:max-w-[250px] /* Target iPads */
          md:right-[5%] md:top-[40%] md:max-w-[250px]
          lg:right-[10%] lg:top-[35%] lg:max-w-[300px]
          xl:right-[5%] xl:top-[30%] xl:max-w-[350px]
          1920:right-[250px] 1920:top-[35%] 1920:max-w-[400px]
          3xl:right-[1000px] 3xl:top-[35%] 3xl:max-w-[400px]
          sm:right-[0%] bottom-[-5%] sm:max-w-[200px] sm:translate-y-[10%]"
      />

    </div>
  );
};

export default LoginPage;
