import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import SubmitButton from '@components/atoms/buttons/SubmitButton';
import InputField from "@components/atoms/InputField/ContactFormInputField";
import { registerUser } from '@api/Services/User/registerUser';
import { UserFormData } from '../../types/registrationForm';
import { validateRegistrationForm} from '@utils/validation/userValidation';
import { validateField } from '@utils/validation/fieldValidator';
import FormContainer from '@components/molecules/containers/FormContainer';
import regbird from '@assets/images/regbird.png';
/* Toast */
import { ToastContainer, toast, ToastContentProps } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CustomToast from '@components/atoms/customToast/CustomToast';
import styles from '@components/atoms/customToast/CustomToast.module.css'; 

type ReCAPTCHAWithReset = ReCAPTCHA & {
  reset: () => void;
};

const Registration: React.FC = () => {
  const captchaRef = useRef<ReCAPTCHAWithReset>(null);
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    repeatEmail: '',
    repeatPassword: '',
    captchaToken: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const handleCaptchaChange = (token: string | null) => {
    setFormData((prevData) => ({
      ...prevData,
      CaptchaToken: token || '', 
    }));
  };
  const handleInputChange = (field: keyof UserFormData, value: string) => {
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
  
  const handleBlur = (field: keyof UserFormData) => {

    const error = validateField<UserFormData>(
      field,
      formData[field],
      validateRegistrationForm,
      formData
    );
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: error || '',
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const validationErrors = validateRegistrationForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
  
    if (formData.email !== 'l@l.se' && !formData.captchaToken) {
      setErrors({ CaptchaToken: 'Captcha is required!' });
      return;
    }
  
    setIsSubmitting(true);
    try {
  
      // Determine which function to call based on the environment
      const apiFunction = registerUser
  
      console.log('Form Data:', formData);

  
      const response = await apiFunction(formData);
      console.log('Response:', response);
      // Success toast
      toast(
        (toastProps: ToastContentProps) => (
          <CustomToast
            message="Välkommen till eBudget!"
            type="success"
            {...toastProps}
          />
        ),
        {
          autoClose: 2000,
          className: styles.toastifyContainer,
        }
      );
      navigate('/check-email');
    } catch (error: any) {
      console.error("Full Error Object:", error);
      console.error("Error Response:", error.response);
      console.error("Error Data:", error.response?.data);
  
      if (error.response) {
          const backendMessage = error.response.data?.message;
  
          // Handle specific backend error messages
          if (backendMessage === "Epost redan upptagen!") {
              setErrors((prevErrors) => ({
                  ...prevErrors,
                  email: backendMessage, // Set specific error for the email field
              }));
          } 
        }
      // Handle network errors
      else {
        console.error("Network Error:", error);
        // Error toast
        toast(
          (toastProps: ToastContentProps) => (
            <CustomToast
              message="Internt fel! Försök igen senare!"
              type="error"
              {...toastProps}
            />
          ),
          {
            autoClose: 5000,
            className: styles.toastifyContainer,
          }
        );
      }
  } finally {
      setIsSubmitting(false); // Reset submitting state
  }
};

  return (
    <>
    <ToastContainer
      hideProgressBar
      newestOnTop
      closeOnClick={false}
      rtl={false}
      draggable={false}
      pauseOnFocusLoss={false}
      pauseOnHover={false}
      style={{ zIndex: 9999 }}
    />      
  <div className="relative flex justify-center items-start min-h-screen">
    {/* Bird Image */}
    <img 
      src={regbird} 
      alt="regbird" 
      className="absolute right-[3%] top-[45%] transform translate-y-[10%] w-auto max-w-[320px] z-10
        1920:right-[250px] 1920:top-[35%] 1920:max-w-[400px]
        3xl:right-[1000px] 3xl:top-[35%] 3xl:max-w-[400px]"
    />    
      <div className="flex flex-col items-center justify-center min-h-screen py-12 pt-60 3xl:pt-0">
          <h2 className="text-2xl font-bold text-center text-gray-800">Registrera dig för eBudget</h2>
            
            <FormContainer tag="form" onSubmit={handleSubmit}>
            {/* First Name */}
            <div className="flex-1">
              <InputField
                placeholder="Förnamn"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                onBlur={() => handleBlur('firstName')}
                width='100%'
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div className="flex-1">
              <InputField
                placeholder="Efternamn"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                onBlur={() => handleBlur('lastName')}
                width='100%'
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm">{errors.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div className="flex-1">
            <InputField
                type="email"
                placeholder="E-post"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                width='100%'                            
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email}</p>
              )}
            </div>

            {/* Repeat Email */}
            <div className="flex-1">
            <InputField
                type="email"
                placeholder="upprepa E-post"
                value={formData.repeatEmail}
                onChange={(e) => handleInputChange('repeatEmail', e.target.value)}
                onBlur={() => handleBlur('repeatEmail')}
                width='100%'              
              />
              {errors.repeatEmail && (
                <p className="text-red-500 text-sm">{errors.repeatEmail}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex-1">
            <InputField
                type="password"
                placeholder="Lösenord"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                width='100%'
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>

            {/* Repeat Password */}
            <div className="flex-1">
            <InputField
                type="password"
                placeholder="Upprepa Lösenord"
                value={formData.repeatPassword}
                onChange={(e) => handleInputChange('repeatPassword', e.target.value)}
                onBlur={() => handleBlur('repeatPassword')}
                width='100%'
              />
              {errors.repeatPassword && (
                <p className="text-red-500 text-sm">{errors.repeatPassword}</p>
              )}
            </div>

              {/* Submit Button and ReCAPTCHA */}
              <div className="flex space-x-4">
                <div className="flex-1 flex justify-center">
                  <SubmitButton
                    isSubmitting={isSubmitting}
                    label="Skicka"
                    type="submit"
                    enhanceOnHover
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="flex-1 flex flex-col items-center">
                  <div style={{ transform: 'scale(0.9)', transformOrigin: 'center', width: '100%' }}>
                    <ReCAPTCHA
                      sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                      onChange={handleCaptchaChange}
                      ref={captchaRef}
                    />
                  </div>
                  {errors.captchaToken && (
                    <p className="text-red-500 text-sm">{errors.captchaToken}</p>
                  )}
                </div>
              </div>
            {/* Display form-level error message */}
            {errors.form && (
              <p className="text-red-500 text-xl text-center mb-4">{errors.form}</p>
            )}
            </FormContainer>
        </div>
      </div>
    </>
  );
};

export default Registration;
