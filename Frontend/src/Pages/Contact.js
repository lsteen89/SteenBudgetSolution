import React, { useState, useRef  } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contact.css';
import ContactUsBird from '../assets/Images/ContactUsBird.png';
import ReCAPTCHA from 'react-google-recaptcha';
//import { submitContactForm } from '../api/Services/Mail/contactUs'; 
import SubmitButton from '../components/buttons/SubmitButton'; 

function AboutUs() {
  const captchaRef = useRef(null); 
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fornamn: '',
    efternamn: '',
    epost: '',
    amne: '',
    meddelande: ''
  });
  const [captchaToken, setCaptchaToken] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
  };

/* Mock for testing
*/
// Mock for testing, simulating both success and error scenarios
const submitContactForm = async (data) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (data && data.epost !== 'error@example.com') { 
        // Resolve with a status to simulate a successful API response
        resolve({ status: 200, message: "Form submitted successfully" });
      } else {
        // Reject with an error message to simulate a failure
        reject(new Error("Submission failed. Please try again."));
      }
    }, 5000); // 5-second delay
  });
};

const validateForm = () => {
  const newErrors = {};

  if (!/^[a-zA-Z]{1,20}$/.test(formData.fornamn)) {
    newErrors.fornamn = 'Vänligen ange';
    setErrors(newErrors);
    return false; // Stop validation once the first error is encountered
  }
  
  if (!/^[a-zA-Z]{1,20}$/.test(formData.efternamn)) {
    newErrors.efternamn = 'Vänligen ange';
    setErrors(newErrors);
    return false;
  }

  if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.epost)) {
    newErrors.epost = 'Ogiltigt epost format!';
    setErrors(newErrors);
    return false;
  }

  if (formData.amne.trim() === '') {
    newErrors.amne = 'Ämne kan inte vara tomt!';
    setErrors(newErrors);
    return false;
  }

  if (formData.meddelande.length < 10) {
    newErrors.meddelande = 'Meddelande måste vara minst 10 tecken långt!';
    setErrors(newErrors);
    return false;
  }

  setErrors({}); // Clear errors if all fields are valid
  return true; // Return true if there are no validation errors
};


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted', formData);
  
    if (validateForm()) {
      if (!captchaToken) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          captcha: 'Captcha är obligatoriskt!',
        }));
        return;
      }
  
      try {
        setIsSubmitting(true); 
        const translatedData = {
          FirstName: formData.fornamn,
          LastName: formData.efternamn,
          SenderEmail: formData.epost,
          subject: formData.amne,
          body: formData.meddelande,
          CaptchaToken: captchaToken
        };
  
        const result = await submitContactForm(translatedData);
        console.log('Form submitted successfully:', result);
  
        // Only set `isSubmitted` to true if the submission was successful
        if (result.status === 200) {
          setIsSubmitted(true);
  
          // Reset form data upon successful submission, unless email is "l@l.se"
          if (formData.epost !== 'l@l.se') {
            setFormData({
              fornamn: '',
              efternamn: '',
              epost: '',
              amne: '',
              meddelande: ''
            });
          }
  
          setCaptchaToken(null);
          captchaRef.current.reset();
          setErrors({}); // Clear any errors
  
        } else {
          // Handle a non-200 status by showing an error message
          setErrors((prevErrors) => ({
            ...prevErrors,
            form: 'Något gick fel, försök igen',
          }));
        }
  
      } catch (error) {
        console.error('Error submitting form:', error);
        // Catch block for network or server errors
        setErrors((prevErrors) => ({
          ...prevErrors,
          form: 'Något gick fel, försök igen', 
        }));
  
      } finally {
        setIsSubmitting(false); 
      }
    } else {
      console.log('Validation failed:', errors);
    }
  };

  return (
    <div className="contact-container-wrapper">
      <img src={ContactUsBird} alt="ContactUsBird" className="ContactUs-bird-image" />
      <div className="contact-container">
        <p className="contact-text">
          Vi välkomnar din feedback och eventuella frågor! <br /><br />
          Du kan kontakta oss genom att fylla i formuläret nedanför
        </p>
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-wrapper">
              <input
                type="text"
                name="fornamn"
                placeholder="Förnamn"
                value={formData.fornamn}
                onChange={handleChange}
              />
              {errors.fornamn ? (
                <span className="error-message">{errors.fornamn}</span>
              ) : (
                <span className="error-message" style={{ visibility: 'hidden' }}>Placeholder</span>
              )}
              </div>

              <div className="input-wrapper">
              <input
                type="text"
                name="efternamn"
                placeholder="Efternamn"
                value={formData.efternamn}
                onChange={handleChange}
              />
            {errors.efternamn ? (
              <span className="error-message">{errors.efternamn}</span>
            ) : (
              <span className="error-message" style={{ visibility: 'hidden' }}>Placeholder</span>
            )}
            </div>
          </div>
          <input
            type="email"
            name="epost"
            placeholder="Epost"
            value={formData.epost}
            onChange={handleChange}
          />
          {errors.epost && <span className="error-message">{errors.epost}</span>}
          <input
            type="text"
            name="amne"
            placeholder="Ämne"
            value={formData.amne}
            onChange={handleChange}
          />
          {errors.amne && <span className="error-message">{errors.amne}</span>}
          <textarea
            name="meddelande"
            placeholder="Meddelande"
            rows="4"
            value={formData.meddelande}
            onChange={handleChange}
          />
          {/* Error display for specific field errors */}
          {errors.meddelande && <span className="error-message">{errors.meddelande}</span>}
          {errors.captcha && <div className="error-message">{errors.captcha}</div>}

          {/* General error message display */}
          {errors.form && <div className="error-message">{errors.form}</div>}

          {/* Success message display */}
          {isSubmitted && <p className="success-message">Skickat!</p>}
          <div className="form-submit">
            {/* Use SubmitButton here with isSubmitting and label */}
            <SubmitButton isSubmitting={isSubmitting} label="Skicka" />
            <ReCAPTCHA
              sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
              onChange={handleCaptchaChange}
              ref={captchaRef}
            />
          </div>
        </form>

      </div>
    </div>
  );
}

export default AboutUs;
