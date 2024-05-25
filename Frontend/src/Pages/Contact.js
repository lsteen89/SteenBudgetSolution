import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Contact.css'; // Make sure to import the CSS file
import ContactUsBird from '../assets/Images/ContactUsBird.png'; // Update the path as needed

function AboutUs() {
  const navigate = useNavigate(); // Initialize the useNavigate hook

  return (
    <div className="contact-container-wrapper">
      <img src={ContactUsBird} alt="ContactUsBird" className="ContactUs-bird-image" />
      <div className="contact-container">
        <p className="contact-text">
          Vi välkomnar din feedback och eventuella frågor! <br /><br />
          Du kan kontakta oss genom att fylla i formuläret nedanför
        </p>
        <form className="contact-form">
          <div className="form-row">
            <input type="text" name="fornamn" placeholder="Förnamn" required />
            <input type="text" name="efternamn" placeholder="Efternamn" required />
          </div>
          <input type="email" name="epost" placeholder="Epost" required />
          <input type="text" name="amne" placeholder="Ämne" required />
          <textarea name="meddelande" placeholder="Meddelande" rows="4" required></textarea>
          <div className="form-submit">
            <button type="submit">Skicka</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AboutUs;

