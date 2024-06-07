import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contact.css'; // Make sure to import the CSS file
import ContactUsBird from '../assets/Images/ContactUsBird.png'; // Update the path as needed

function AboutUs() {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  const [formData, setFormData] = useState({
    fornamn: '',
    efternamn: '',
    epost: '',
    amne: '',
    meddelande: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!/^[a-zA-Z]{1,20}$/.test(formData.fornamn)) {
      newErrors.fornamn = 'Förnamn får inte innehålla mellanslag och kan inte vara längre än 20 tecken!';
    }
    if (!/^[a-zA-Z]{1,20}$/.test(formData.efternamn)) {
      newErrors.efternamn = 'Efternamn får inte innehålla mellanslag och kan inte vara längre än 20 tecken!';
    }
    if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(formData.epost)) {
      newErrors.epost = 'Ogiltigt epost format!';
    }
    if (formData.amne.trim() === '') {
      newErrors.amne = 'Ämne kan inte vara tomt!';
    }
    if (formData.meddelande.length < 10) {
      newErrors.meddelande = 'Meddelande måste vara minst 10 tecken långt!';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submitted', formData); // Debugging: Check if handleSubmit is called
    if (validateForm()) {
      try {
        const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });
        const result = await response.json();
        if (response.ok) {
          console.log('Form submitted successfully:', result);
          setIsSubmitted(true); // Set submission status to true
        } else {
          console.log('Form submission failed:', result);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
      }
    } else {
      console.log('Validation failed:', errors); // Debugging: Check validation errors
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
            <input
              type="text"
              name="fornamn"
              placeholder="Förnamn"
              value={formData.fornamn}
              onChange={handleChange}
              required
            />
            {errors.fornamn && <span className="error-message">{errors.fornamn}</span>}
            <input
              type="text"
              name="efternamn"
              placeholder="Efternamn"
              value={formData.efternamn}
              onChange={handleChange}
              required
            />
            {errors.efternamn && <span className="error-message">{errors.efternamn}</span>}
          </div>
          <input
            type="email"
            name="epost"
            placeholder="Epost"
            value={formData.epost}
            onChange={handleChange}
            required
          />
          {errors.epost && <span className="error-message">{errors.epost}</span>}
          <input
            type="text"
            name="amne"
            placeholder="Ämne"
            value={formData.amne}
            onChange={handleChange}
            required
          />
          {errors.amne && <span className="error-message">{errors.amne}</span>}
          <textarea
            name="meddelande"
            placeholder="Meddelande"
            rows="4"
            value={formData.meddelande}
            onChange={handleChange}
            required
          />
          {errors.meddelande && <span className="error-message">{errors.meddelande}</span>}
          <div className="form-submit">
            <button type="submit">Skicka</button>
          </div>
        </form>
        {isSubmitted && (
          <p className="success-message">Skickat!</p>
        )}
      </div>
    </div>
  );
}

export default AboutUs;
