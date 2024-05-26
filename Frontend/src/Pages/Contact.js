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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Proceed with form submission
      console.log('Form submitted', formData);
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
      </div>
    </div>
  );
}

export default AboutUs;
