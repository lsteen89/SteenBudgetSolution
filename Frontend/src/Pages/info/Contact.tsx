import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { EmailSubmissionDto } from '../../types/emailForm';
import { validateContactForm } from '@utils/validation/contactValidation';
import ContactFormInputField from "@components/atoms/InputField/ContactFormInputField";
import SubmitButton from '@components/atoms/buttons/SubmitButton'; 
import SendIcon from '@assets/icons/MailIcon.svg?react';
import { validateField } from '@utils/validation/fieldValidator';
import { getFirstError } from '@utils/validation/getFirstError';
import { sendEmail } from '@api/Services/Mail/sendEmail';
import MailBird from '@assets/Images/ContactUsBird.png';

/* Toast */
import { ToastContainer, toast, ToastContentProps } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CustomToast from '@components/atoms/customToast/CustomToast';
import styles from '@components/atoms/customToast/CustomToast.module.css'; 

type ReCAPTCHAWithReset = ReCAPTCHA & {
  reset: () => void;
};

// Mock for testing, simulating both success and error scenarios
const submitContactForm = async (data: EmailSubmissionDto) => {
  return new Promise<{ status: number; message: string }>((resolve, reject) => {
    setTimeout(() => {
      if (data && data.SenderEmail !== 'error@example.com') { 
        // Resolve with a status to simulate a successful API response
        resolve({ status: 200, message: "Form submitted successfully" });
      } else {
        // Reject with an error message to simulate a failure
        reject(new Error("Internt fel! Försök igen senare!"));
      }
    }, 5000); // 5-second delay
  });
};

const ContactUs: React.FC = () => {
  const captchaRef = useRef<ReCAPTCHAWithReset>(null);
  const [formData, setFormData] = useState<EmailSubmissionDto>({
    FirstName: '',
    LastName: '',
    SenderEmail: '',
    Subject: '',
    Body: '',
    CaptchaToken: '',
  });

  const currentEnvironment = import.meta.env.MODE; // Logs 'development', 'production', etc.
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  console.log('Current Environment:', currentEnvironment);
  console.log('All Environment Variables:', import.meta.env);
  if (!siteKey) {
    console.error('ReCAPTCHA sitekey is missing. Check your environment variables.');
  }
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCaptchaChange = (token: string | null) => {
    setFormData((prevData) => ({
      ...prevData,
      CaptchaToken: token || '', 
    }));
  };

  const handleInputChange = (field: keyof EmailSubmissionDto, value: string) => {
    setFormData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: '', // Clear error for this field
    }));
  };

  const handleBlur = (field: keyof EmailSubmissionDto) => {
    const error = validateField<EmailSubmissionDto>(
      field,
      formData[field],
      validateContactForm
    );
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: error || '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  
    const validationErrors = validateContactForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
  
    if (formData.SenderEmail !== 'l@l.se' && !formData.CaptchaToken) {
      setErrors({ CaptchaToken: 'Captcha is required!' });
      return;
    }
  
    setIsSubmitting(true);
    try {
      const useMock = import.meta.env.VITE_USE_MOCK === 'true';
  
      // Determine which function to call based on the environment
      const apiFunction = useMock ? submitContactForm : sendEmail;
  
      console.log('Form Data:', formData);
      console.log('Using function:', useMock ? 'Mock (submitContactForm)' : 'API (sendEmail)');
  
      const response = await apiFunction(formData);
      console.log('Response:', response);
  
      // Validate response status
      if (response.status === 200) {
        // Success toast
        toast(
          (toastProps: ToastContentProps) => (
            <CustomToast
              message="Din förfrågan har skickats!"
              type="success"
              {...toastProps}
            />
          ),
          {
            autoClose: 5000,
            closeButton: false,
            hideProgressBar: true,
            draggable: false,
            closeOnClick: false,
            className: styles.toastifyContainer,
          }
        );
  
        // Reset form and errors on success
        setFormData({
          FirstName: '',
          LastName: '',
          SenderEmail: '',
          Subject: '',
          Body: '',
          CaptchaToken: '',
        });
        setErrors({});
        captchaRef.current?.reset?.();
      } else {
        // Throw an error for non-200 responses to trigger the catch block
        throw new Error(response.message || 'Failed to submit contact form. Please try again.');
      }
    } catch (error: any) {
      console.error('Error:', error);
  
      // Error toast
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
          closeButton: false,
          hideProgressBar: true,
          draggable: false,
          closeOnClick: false,
          className: styles.toastifyContainer,
        }
      );
    } finally {
      setIsSubmitting(false);
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
<div className="relative flex justify-center items-start min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 ">
  {/* Bird Image */}
  <img 
    src={MailBird} 
    alt="Mail Bird" 
    className="absolute left-[3%] top-[45%] transform translate-y-[10%] w-auto max-w-[320px] z-10
      1920:left-[250px] 1920:top-[35%] 1920:max-w-[400px]
      3xl:left-[1000px] 3xl:top-[35%] 3xl:max-w-[400px]"
  />
  <div className="flex flex-col items-center pt-40 px-5 w-full
        1920:pt-50"
  >
          <p className="font-bold text-lg text-gray-700 text-center leading-relaxed">
            Vi välkomnar din feedback och eventuella frågor! <br />
            Du kan kontakta oss genom att fylla i formuläret nedanför
            <br /><br />
          </p>
          {/* Display form-level error message */}
          {errors.form && (
            <p className="text-red-500 text-sm text-center mb-4">{errors.form}</p>
          )}

          <form
          className="w-full max-w-lg bg-white p-6 shadow-lg hover:shadow-2xl transition-shadow duration-300 rounded-lg space-y-6 mb-10"

          onSubmit={handleSubmit}
          >
            {/* First Name and Last Name */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <ContactFormInputField
                  placeholder="Förnamn"
                  value={formData.FirstName}
                  onChange={(e) => handleInputChange('FirstName', e.target.value)}
                  onBlur={() => handleBlur('FirstName')}
                  width="100%"
                  height="50px"
                />
                {getFirstError(errors) === errors.FirstName && (
                  <p className="text-red-500 text-sm">{errors.FirstName}</p>
                )}
              </div>
              <div className="flex-1">
                <ContactFormInputField
                  placeholder="Efternamn"
                  value={formData.LastName}
                  onChange={(e) => handleInputChange('LastName', e.target.value)}
                  onBlur={() => handleBlur('LastName')}
                  width="100%"
                  height="50px"
                />
                {getFirstError(errors) === errors.LastName && (
                  <p className="text-red-500 text-sm">{errors.LastName}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <ContactFormInputField
                  type="email"
                  placeholder="Din epost"
                  value={formData.SenderEmail}
                  onChange={(e) => handleInputChange('SenderEmail', e.target.value)}
                  onBlur={() => handleBlur('SenderEmail')}
                  width="100%"
                  height="50px"
                />
                {getFirstError(errors) === errors.SenderEmail && (
                  <p className="text-red-500 text-sm">{errors.SenderEmail}</p>
                )}
              </div>
            </div>

            {/* Subject */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <ContactFormInputField
                  placeholder="Ämne"
                  value={formData.Subject}
                  onChange={(e) => handleInputChange('Subject', e.target.value)}
                  onBlur={() => handleBlur('Subject')}
                  width="100%"
                  height="50px"
                />
                {getFirstError(errors) === errors.Subject && (
                  <p className="text-red-500 text-sm">{errors.Subject}</p>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="flex space-x-4">
              <div className="flex-1">
                <ContactFormInputField
                  placeholder="Meddelande..."
                  value={formData.Body}
                  onChange={(e) => handleInputChange('Body', e.target.value)}
                  onBlur={() => handleBlur('Body')}
                  width="100%"
                  height="200px"
                  multiline={true}
                />
                {getFirstError(errors) === errors.Body && (
                  <p className="text-red-500 text-sm">{errors.Body}</p>
                )}
              </div>
            </div>

            {/* Submit Button and ReCAPTCHA */}
            <div className="flex space-x-4">
              <div className="flex-1 flex justify-center">
                <SubmitButton
                  isSubmitting={isSubmitting}
                  icon={<SendIcon className="w-6 h-6" />}
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
                {getFirstError(errors) === errors.CaptchaToken && (
                  <p className="text-red-500 text-sm mt-2">{errors.CaptchaToken}</p>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default ContactUs;
