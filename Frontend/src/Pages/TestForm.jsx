import React, { useState, useRef } from 'react';
import SubmitButton from '../components/atoms/buttons/SubmitButton';
import InputField from '../components/atoms/InputField/InputField';
import './TestForm.module.css'; 
const TestPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleBlur = () => {
    // Validation logic can be added here
  };

  const handleTestClick = () => {
    alert("Button clicked!");
  };

  return (
    <div style={styles.pageContainer}>
      <h2 style={styles.headerText}>Test Form with Input Fields</h2>
      <form style={styles.formContainer} onSubmit={(e) => e.preventDefault()}>
        <div style={styles.formFields}>
          <InputField
            className="slim-input"
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.firstName}
            placeholder="Enter your first name"
          />
          <InputField
            className="slim-input"
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.lastName}
            placeholder="Enter your last name"
          />
          <InputField
            className="slim-input"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.email}
            placeholder="Enter your email"
          />
          <InputField
            className="slim-input"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.password}
            placeholder="Choose a password"
          />
        </div>
        <div style={styles.buttonContainer}>
          <SubmitButton
            isSubmitting={false}
            label="Submit"
            onClick={handleTestClick}
            style={styles.buttonStyle}
          />
        </div>
      </form>
    </div>
  );
};

const styles = {
  pageContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
  },
  headerText: {
    marginBottom: '20px',
    fontSize: '24px',
    color: '#333',
    textAlign: 'center',
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '500px',
    width: '100%',
  },
  formFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
  },
  buttonStyle: {
    width: '200px',
    height: '40px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '16px',
  },
};

export default TestPage;