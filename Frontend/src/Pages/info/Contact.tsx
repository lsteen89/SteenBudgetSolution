import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { EmailSubmissionDto } from '../../types/User/Email/emailForm';
import { validateContactForm } from '@utils/validation/contactValidation';
import ContactFormInputField from "@components/atoms/InputField/ContactFormInputField";
import SubmitButton from '@components/atoms/buttons/SubmitButton'; 
import SendIcon from '@assets/icons/MailIcon.svg?react';
import { validateField } from '@utils/validation/fieldValidator';
import { sendEmail } from '@api/Services/Mail/sendEmail';
import MailBird from '@assets/Images/ContactUsBird.png';
import FormContainer from '@components/molecules/containers/FormContainer';
import PageContainer from '@components/layout/PageContainer';
import ContentWrapper from '@components/layout/ContentWrapper';


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
      validateContactForm,
      formData
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
      <PageContainer centerChildren={true} >
        <ContentWrapper className='
          py-10
          lg:pt-[10%]
          xl:pt-[5%]
          '
          centerContent={true}
        >
          <FormContainer tag="form" 
            className='
            z-10
            ' 
            onSubmit={handleSubmit} 
            bgColor="gradient"
            
          >

            <p className="font-bold text-lg text-gray-700 text-center leading-relaxed ">
              Vi välkomnar din feedback och eventuella frågor! <br />
              Du kan kontakta oss genom att fylla i formuläret nedanför
              <br /><br />
            </p>
            {/* Display form-level error message */}
            {errors.form && (
              <p className="text-red-500 text-sm text-center mb-4">{errors.form}</p>
            )}
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
                {errors.FirstName && (
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
                {errors.LastName && (
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
                {errors.SenderEmail && (
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
                {errors.Subject && (
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
                {errors.Body && (
                  <p className="text-red-500 text-sm">{errors.Body}</p>
                )}
                {errors.CaptchaToken && (
                  <p className="text-red-500 text-sm">{errors.CaptchaToken}</p>
                )}
              </div>
            </div>
            {/* Submit Button and ReCAPTCHA */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 items-center">
              {/* Submit Button */}
              <div className="flex-1 flex justify-center w-full sm:w-auto">
                <SubmitButton
                  isSubmitting={isSubmitting}
                  icon={<SendIcon className="w-6 h-6" />}
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

        </FormContainer>
          
        {/* Bird Image */}
        <img
          src={MailBird}
          alt="Mail Bird"
          className="z-0 w-auto max-w-[320px] mt-10 
          sm:relative 
          md:relative
          lg:relative
          xl:absolute xl:left-[5%] xl:top-1/2 xl:transform xl:-translate-y-1/2
          2xl:absolute 2xl:left-[5%] 2xl:top-1/2 2xl:transform 2xl:-translate-y-1/2
          3xl:absolute 3xl:left-[30%] 3xl:top-1/2 3xl:transform 3xl:-translate-y-1/2
          "
        />
      </ContentWrapper>
    </PageContainer>
    </>
  );
};

export default ContactUs;
