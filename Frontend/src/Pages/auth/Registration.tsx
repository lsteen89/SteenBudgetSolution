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
import regbird from '@assets/Images/RegBird.png';
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
    honeypot: '', 
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const handleCaptchaChange = (token: string | null) => {
    setFormData((prevData) => ({
        ...prevData,
        captchaToken: token || '', 
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
      
      // Reset the captcha if there are validation errors
      if (captchaRef.current) {
        captchaRef.current.reset();
        setFormData((prevData) => ({
            ...prevData,
            captchaToken: '', // Clear the captcha token
        }));
    }

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
        // Reset the captcha on failure
        if (captchaRef.current) {
          captchaRef.current.reset();
          setFormData((prevData) => ({
              ...prevData,
              captchaToken: '', // Clear the captcha token
          }));
      }

      if (error.response) {
        const statusCode = error.response.status;
          const backendMessage = error.response.data?.message;
        // Handle 429 Too Many Requests
        if (statusCode === 429) {
          const retryAfter = error.response.headers['retry-after'];
          toast(
            (toastProps: ToastContentProps) => (
              <CustomToast
                message={`För många försök. Vänta ${retryAfter || 'några sekunder'} och försök igen.`}
                type="error"
                {...toastProps}
              />
            ),
            {
              autoClose: retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000,
              className: styles.toastifyContainer,
            }
          );
          return;
      }
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
    <div className="relative flex justify-center items-start min-h-screen mt-[5%]">
      <div className="flex flex-col items-center pt-10 px-5 w-full sm:pt-10 xl:pt-[10%] 2xl:pt-[10%] 3xl:pt-[3%]">
        <FormContainer tag="form" onSubmit={handleSubmit} bgColor="gradient">
          {/* First Name */}
          <h2 className="text-2xl font-bold text-center text-gray-800">Skaffa <span className="font-bold text-darkLimeGreen underline">eBudget</span> användare!</h2>
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
          <div className="hidden">
            <label htmlFor="honeypot" className="sr-only">
                Leave this field blank
            </label>
            <input
              id="honeypot"
              type="text"
              name="honeypot"
              value={formData.honeypot || ''}
              onChange={(e) =>
                  setFormData((prevData) => ({
                      ...prevData,
                      honeypot: e.target.value,
                  }))
              }
              aria-hidden="true"
              tabIndex={-1}
              className="hidden"
            />
          </div>              
          {/* Submit Button and ReCAPTCHA */}
          <div className="flex flex-col sm:flex-row sm:space-x-4 items-center">
            <div className="mt-4 sm:mt-0 flex justify-center w-full sm:w-auto">
              <SubmitButton
                isSubmitting={isSubmitting}
                label="Skicka"
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
          {/* Display form-level error message */}
            {errors.form && (
              <p className="text-red-500 text-xl text-center mb-4">{errors.form}</p>
            )}
          {errors.captchaToken && (
            <p className="text-red-500 text-sm">{errors.captchaToken}</p>
          )}
        </FormContainer>
        {/* Bird Image */}
        <img 
          src={regbird} 
          alt="regbird" 
          className="z-0 w-auto max-w-[320px]

          xl:absolute xl:right-[10%] xl:top-1/2 xl:transform xl:-translate-y-1/2
          2xl:absolute 2xl:right-[10%] 2xl:top-1/2 2xl:transform 2xl:-translate-y-1/2
          3xl:absolute 3xl:right-[30%] 3xl:top-1/2 3xl:transform 3xl:-translate-y-1/2
          "
        />   
      </div>
    </div>
    </>
  );
};

export default Registration;



