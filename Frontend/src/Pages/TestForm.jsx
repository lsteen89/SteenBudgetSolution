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
      <div className="
  bg-pink-500       /* default for all smaller screens */
  md:bg-purple-500  /* up to 768px */
  lg:bg-green-500   /* up to 1279px, overrides md for smaller widths too */
  xl:bg-yellow-500  /* 1280px to 1919px */
  1920:bg-blue-500  /* exactly 1920×1080 */
  3xl:bg-gray-500   /* 1921px+ */
">
  Test custom breakpoints
</div>

    </div>
  );
};

  

export default TestPage;